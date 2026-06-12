import type { TownTuneNote } from '../types';
import {
  BELL_PLAYLIST_ITEM_GAP_SECONDS,
  buildBellPlaylist,
  getBellPlaybackRate,
  HOURLY_BGM_FADE_OUT_MS,
  type BellPlaylist,
  type BellPlaylistEntry,
} from './townTuneBell';

type AudioContextCtor = typeof AudioContext;
type PlaybackTimer = ReturnType<typeof setTimeout>;

const ATTACK_MS = 10;
const RELEASE_MS = 30;
const STRIKE_ATTACK_MS = 8;
const STRIKE_RELEASE_MS = 50;
const BUFFER_MARGIN_SECONDS = 0.01;
const bellOnsetCache = new WeakMap<AudioBuffer, number>();

export interface AudioPlaybackHandle {
  finished: Promise<void>;
  stop(): void;
}

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof AudioContext !== 'undefined') {
    return AudioContext;
  }

  const prefixed = (globalThis as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  return prefixed ?? null;
}

export class WebAudioEngine {
  private context: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private effectGain: GainNode | null = null;
  private currentBgmVolume = 1;
  private bgmDuckMultiplier = 1;
  private effectVolume = 1;

  get ready(): boolean {
    return this.context !== null;
  }

  async ensureContext(): Promise<AudioContext> {
    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      throw new Error('Web Audio is not available.');
    }
    if (!this.context) {
      this.context = new Ctor();
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    return this.context;
  }

  async decode(bytes: ArrayBuffer): Promise<AudioBuffer> {
    const context = await this.ensureContext();
    return context.decodeAudioData(bytes.slice(0));
  }

  async playLoop(buffer: AudioBuffer, volume: number): Promise<void> {
    const context = await this.ensureContext();
    this.stop();
    this.currentBgmVolume = clampVolume(volume);
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = this.getEffectiveBgmVolume();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain).connect(context.destination);
    source.start();
    this.currentSource = source;
    this.currentGain = gain;
  }

  async playBufferOnce(buffer: AudioBuffer, volume: number): Promise<void> {
    const context = await this.ensureContext();
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain).connect(context.destination);
    source.start();
    await new Promise((resolve) => {
      source.onended = () => resolve(undefined);
    });
  }

  async fadeOutBgm(fadeOutMs = HOURLY_BGM_FADE_OUT_MS): Promise<void> {
    if (!this.currentSource || !this.currentGain || !this.context) {
      return;
    }

    const source = this.currentSource;
    const gain = this.currentGain;
    const fadeSeconds = Math.max(0, fadeOutMs) / 1000;
    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);

    await delay(fadeOutMs);
    try {
      source.stop();
    } catch {
      // Already stopped.
    }
    if (this.currentSource === source) {
      this.currentSource = null;
      this.currentGain = null;
    }
  }

  setVolume(volume: number): void {
    this.currentBgmVolume = clampVolume(volume);
    this.applyBgmGain();
  }

  setBgmDuck(multiplier: number, fadeMs = 0): void {
    this.bgmDuckMultiplier = clampVolume(multiplier);
    this.applyBgmGain(fadeMs);
  }

  setEffectVolume(volume: number): void {
    this.effectVolume = clampVolume(volume);
    if (this.effectGain) {
      this.effectGain.gain.value = this.effectVolume;
    }
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Already stopped.
      }
    }
    this.currentSource = null;
    this.currentGain = null;
  }

  async playTownTuneFromBell(buffer: AudioBuffer, notes: TownTuneNote[], volume: number): Promise<void> {
    const playback = await this.startTownTuneFromBell(buffer, notes, volume);
    await playback.finished;
  }

  async startTownTuneFromBell(buffer: AudioBuffer, notes: TownTuneNote[], volume: number): Promise<AudioPlaybackHandle> {
    const playlist = this.buildPlaylist(buffer, notes, 0);
    return this.startBellPlaylistFromBell(buffer, playlist, volume);
  }

  async playBellPlaylistFromBell(buffer: AudioBuffer, notes: TownTuneNote[], strikes: number, volume: number): Promise<void> {
    const playlist = this.buildPlaylist(buffer, notes, strikes);
    const playback = await this.startBellPlaylistFromBell(buffer, playlist, volume);
    await playback.finished;
  }

  async startBellPlaylistFromBell(buffer: AudioBuffer, playlist: BellPlaylist, volume: number): Promise<AudioPlaybackHandle> {
    const context = await this.ensureContext();
    if (playlist.entries.length === 0) {
      return createResolvedPlaybackHandle();
    }

    this.setEffectVolume(volume);
    const destination = this.ensureEffectDestination(context);
    const bellOnsetOffset = getBellOnsetOffsetSeconds(buffer);
    const startTime = context.currentTime;
    const scheduledSources: AudioBufferSourceNode[] = [];

    for (const entry of playlist.entries) {
      if (entry.kind === 'note') {
        scheduledSources.push(scheduleBellNote(context, buffer, entry, {
          bellOnsetOffset,
          destination,
          durationSeconds: entry.durationSeconds,
          startTime: startTime + entry.startSeconds,
        }));
      } else {
        scheduledSources.push(scheduleBellStrike(context, buffer, {
          bellOnsetOffset,
          destination,
          durationSeconds: entry.durationSeconds,
          startTime: startTime + entry.startSeconds,
        }));
      }
    }

    let done = false;
    let timer: PlaybackTimer | null = null;
    let resolveFinished: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
      timer = setTimeout(resolve, Math.ceil(playlist.audibleEndSeconds * 1000) + 20);
    }).then(() => {
      done = true;
    });

    return {
      finished,
      stop() {
        if (done) {
          return;
        }
        done = true;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        for (const source of scheduledSources) {
          try {
            source.stop(context.currentTime);
          } catch {
            // Already stopped.
          }
        }
        resolveFinished();
      },
    };
  }

  private buildPlaylist(buffer: AudioBuffer, notes: TownTuneNote[], strikes: number): BellPlaylist {
    const bellOnsetOffset = getBellOnsetOffsetSeconds(buffer);
    return buildBellPlaylist({
      notes,
      strikes,
      noteUnitSeconds: Math.max(0.02, buffer.duration),
      strikeDurationSeconds: Math.max(0.05, buffer.duration - bellOnsetOffset),
      nextItemAtSeconds: BELL_PLAYLIST_ITEM_GAP_SECONDS,
    });
  }

  private ensureEffectDestination(context: AudioContext): GainNode {
    if (!this.effectGain) {
      this.effectGain = context.createGain();
      this.effectGain.gain.value = this.effectVolume;
      this.effectGain.connect(context.destination);
    }
    return this.effectGain;
  }

  private getEffectiveBgmVolume(): number {
    return clampVolume(this.currentBgmVolume * this.bgmDuckMultiplier);
  }

  private applyBgmGain(fadeMs = 0): void {
    if (!this.currentGain || !this.context) {
      return;
    }

    const effectiveVolume = this.getEffectiveBgmVolume();
    if (fadeMs <= 0) {
      this.currentGain.gain.value = effectiveVolume;
      return;
    }

    const now = this.context.currentTime;
    this.currentGain.gain.cancelScheduledValues(now);
    this.currentGain.gain.setValueAtTime(this.currentGain.gain.value, now);
    this.currentGain.gain.linearRampToValueAtTime(effectiveVolume, now + fadeMs / 1000);
  }
}

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return 0;
  }
  return Math.min(1, Math.max(0, volume));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function createResolvedPlaybackHandle(): AudioPlaybackHandle {
  return {
    finished: Promise.resolve(),
    stop() {
      // Already finished.
    },
  };
}

function getBellOnsetOffsetSeconds(buffer: AudioBuffer): number {
  const cached = bellOnsetCache.get(buffer);
  if (typeof cached === 'number') {
    return cached;
  }

  const channel = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate || 44100;
  const maxProbeSamples = Math.min(channel.length, Math.floor(sampleRate * 2));
  let peak = 0;
  for (let index = 0; index < maxProbeSamples; index += 1) {
    peak = Math.max(peak, Math.abs(channel[index]));
  }

  if (peak < 0.0001) {
    bellOnsetCache.set(buffer, 0);
    return 0;
  }

  const threshold = Math.max(0.01, peak * 0.2);
  let onsetIndex = 0;
  for (let index = 0; index < maxProbeSamples; index += 1) {
    if (Math.abs(channel[index]) >= threshold) {
      onsetIndex = index;
      break;
    }
  }

  const offset = Math.min(Math.max(0, onsetIndex / sampleRate), Math.max(0, buffer.duration - 0.03));
  bellOnsetCache.set(buffer, offset);
  return offset;
}

function buildBellSlicePlan(buffer: AudioBuffer, bellOnsetOffset: number, durationSeconds: number, playbackRate = 1) {
  const neededBufferSeconds = Math.max(0.02, durationSeconds * playbackRate + BUFFER_MARGIN_SECONDS);
  const maxOffset = Math.max(0, buffer.duration - neededBufferSeconds - BUFFER_MARGIN_SECONDS);
  const offset = Math.min(bellOnsetOffset, maxOffset);
  const playableBufferSeconds = Math.max(0.02, Math.min(neededBufferSeconds, buffer.duration - offset));

  return { offset, playableBufferSeconds };
}

function scheduleBellNote(
  context: AudioContext,
  buffer: AudioBuffer,
  entry: Extract<BellPlaylistEntry, { kind: 'note' }>,
  options: {
    bellOnsetOffset: number;
    destination: AudioNode;
    durationSeconds: number;
    startTime: number;
  },
): AudioBufferSourceNode {
  const playbackRate = getBellPlaybackRate(entry.frequency);
  const slice = buildBellSlicePlan(buffer, options.bellOnsetOffset, options.durationSeconds, playbackRate);
  const source = context.createBufferSource();
  const gain = context.createGain();
  const attackSeconds = ATTACK_MS / 1000;
  const releaseSeconds = RELEASE_MS / 1000;
  const endTime = options.startTime + options.durationSeconds;
  const releaseStart = Math.max(options.startTime + attackSeconds, endTime - releaseSeconds);

  source.buffer = buffer;
  source.playbackRate.setValueAtTime(playbackRate, options.startTime);
  source.connect(gain).connect(options.destination);
  gain.gain.setValueAtTime(0, options.startTime);
  gain.gain.linearRampToValueAtTime(1, Math.min(options.startTime + attackSeconds, endTime));
  gain.gain.setValueAtTime(1, releaseStart);
  gain.gain.linearRampToValueAtTime(0, endTime);
  source.start(options.startTime, slice.offset, slice.playableBufferSeconds);
  source.stop(endTime + 0.01);
  return source;
}

function scheduleBellStrike(
  context: AudioContext,
  buffer: AudioBuffer,
  options: {
    bellOnsetOffset: number;
    destination: AudioNode;
    durationSeconds: number;
    startTime: number;
  },
): AudioBufferSourceNode {
  const slice = buildBellSlicePlan(buffer, options.bellOnsetOffset, options.durationSeconds);
  const source = context.createBufferSource();
  const gain = context.createGain();
  const attackSeconds = STRIKE_ATTACK_MS / 1000;
  const releaseSeconds = STRIKE_RELEASE_MS / 1000;
  const endTime = options.startTime + options.durationSeconds;
  const releaseStart = Math.max(options.startTime + attackSeconds, endTime - releaseSeconds);

  source.buffer = buffer;
  source.connect(gain).connect(options.destination);
  gain.gain.setValueAtTime(0, options.startTime);
  gain.gain.linearRampToValueAtTime(1, options.startTime + attackSeconds);
  gain.gain.setValueAtTime(1, releaseStart);
  gain.gain.linearRampToValueAtTime(0, endTime);
  source.start(options.startTime, slice.offset, slice.playableBufferSeconds);
  source.stop(endTime + 0.01);
  return source;
}
