import type { AppSettings, AudioManifest, AudioTrackRef, IslandWeather, LoadProgress, TownTuneNote } from './types';
import { BELL_URL, planInitialAudioLoad } from '../L3_Business/audio/planAudioLoad';
import { getNextHour, selectTrack } from '../L3_Business/audio/selectTrack';
import { createAudioCacheService, type AudioCacheService } from '../L4_Atom/storage/cacheStorageStore';
import { loadAudioResource } from '../L4_Atom/audio/audioBufferLoader';
import { WebAudioEngine, type AudioPlaybackHandle } from '../L4_Atom/audio/webAudio';
import {
  getBellStrikeCount,
  HOURLY_BGM_FADE_OUT_MS,
  TOWN_TUNE_PREVIEW_DUCK_FADE_MS,
  TOWN_TUNE_PREVIEW_DUCK_MULTIPLIER,
} from '../L4_Atom/audio/townTuneBell';

interface PreparedAudio {
  track: AudioTrackRef;
  nextTrack: AudioTrackRef;
  bgmBytes: ArrayBuffer;
  bellBytes: ArrayBuffer | null;
}

export class AudioCore {
  private engine = new WebAudioEngine();
  private cache: AudioCacheService;
  private prepared: PreparedAudio | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private bellBuffer: AudioBuffer | null = null;
  private activeTownTunePreview: AudioPlaybackHandle | null = null;
  private hourlyFlowRunning = false;

  constructor(cache = createAudioCacheService()) {
    this.cache = cache;
  }

  async prepareInitialAudio(
    manifest: AudioManifest,
    settings: AppSettings,
    weather: IslandWeather,
    hour: number,
    onProgress?: (progress: LoadProgress) => void,
  ): Promise<PreparedAudio> {
    const plan = planInitialAudioLoad(manifest, settings, weather, hour);
    const total = plan.items.filter((item) => item.url).length;
    let done = 0;
    let bgmBytes: ArrayBuffer | null = null;
    let bellBytes: ArrayBuffer | null = null;

    for (const item of plan.items) {
      if (!item.url) {
        continue;
      }

      onProgress?.({ done, total, label: item.label, status: 'checkingCache' });
      const loaded = await loadAudioResource(item.url, settings.audio.cacheEnabled ? this.cache : null, (progress) => {
        onProgress?.({ ...progress, done, total, label: item.label });
      });
      done += 1;
      onProgress?.({ done, total, label: item.label, status: loaded.cached ? 'cached' : 'ready' });

      if (item.kind === 'bgm') {
        bgmBytes = loaded.bytes;
      } else if (item.kind === 'bell') {
        bellBytes = loaded.bytes;
      }
    }

    if (!bgmBytes) {
      throw new Error('Current BGM failed to load.');
    }

    this.prepared = {
      track: plan.currentTrack,
      nextTrack: plan.nextTrack,
      bgmBytes,
      bellBytes,
    };
    return this.prepared;
  }

  async startPrepared(settings: AppSettings): Promise<AudioTrackRef> {
    if (!this.prepared) {
      throw new Error('Audio is not prepared.');
    }

    this.currentBuffer = await this.engine.decode(this.prepared.bgmBytes);
    if (this.prepared.bellBytes) {
      this.bellBuffer = await this.engine.decode(this.prepared.bellBytes);
    }
    this.engine.setEffectVolume(settings.audio.townTuneVolume);
    await this.engine.playLoop(this.currentBuffer, settings.audio.bgmVolume);
    return this.prepared.track;
  }

  setBgmVolume(volume: number): void {
    this.engine.setVolume(volume);
  }

  setTownTuneVolume(volume: number): void {
    this.engine.setEffectVolume(volume);
  }

  stop(): void {
    this.stopTownTunePreview();
    this.engine.stop();
  }

  isTownTunePreviewing(): boolean {
    return this.activeTownTunePreview !== null;
  }

  stopTownTunePreview(): void {
    const preview = this.activeTownTunePreview;
    this.activeTownTunePreview = null;
    preview?.stop();
    this.engine.setBgmDuck(1, TOWN_TUNE_PREVIEW_DUCK_FADE_MS);
  }

  async previewTownTune(notes: TownTuneNote[], volume: number): Promise<void> {
    if (notes.length === 0) {
      return;
    }

    const bell = await this.getBellBuffer();
    this.stopTownTunePreview();
    let playback: AudioPlaybackHandle | null = null;

    try {
      this.engine.setBgmDuck(TOWN_TUNE_PREVIEW_DUCK_MULTIPLIER, TOWN_TUNE_PREVIEW_DUCK_FADE_MS);
      playback = await this.engine.startTownTuneFromBell(bell, notes, volume);
      this.activeTownTunePreview = playback;
      await playback.finished;
    } finally {
      if (!playback || this.activeTownTunePreview === playback) {
        this.activeTownTunePreview = null;
        this.engine.setBgmDuck(1, TOWN_TUNE_PREVIEW_DUCK_FADE_MS);
      }
    }
  }

  async preloadNextHour(manifest: AudioManifest, settings: AppSettings, weather: IslandWeather, hour: number): Promise<AudioTrackRef> {
    const nextTrack = selectTrack(manifest, settings.bgmVersion, weather, getNextHour(hour));
    await loadAudioResource(nextTrack.url, settings.audio.cacheEnabled ? this.cache : null);
    return nextTrack;
  }

  async runHourlyFlow(manifest: AudioManifest, settings: AppSettings, weather: IslandWeather, hour: number): Promise<{
    currentTrack: AudioTrackRef;
    nextTrack: AudioTrackRef;
  }> {
    const currentTrack = selectTrack(manifest, settings.bgmVersion, weather, hour);
    const nextTrack = selectTrack(manifest, settings.bgmVersion, weather, getNextHour(hour));

    if (this.hourlyFlowRunning) {
      return { currentTrack, nextTrack };
    }

    this.hourlyFlowRunning = true;
    try {
      this.stopTownTunePreview();
      await this.engine.fadeOutBgm(HOURLY_BGM_FADE_OUT_MS);
      const bell = await this.getBellBuffer(settings.audio.cacheEnabled);

      await this.engine.playBellPlaylistFromBell(bell, settings.townTune.notes, getBellStrikeCount(hour), settings.audio.townTuneVolume);

      const loaded = await loadAudioResource(currentTrack.url, settings.audio.cacheEnabled ? this.cache : null);
      const buffer = await this.engine.decode(loaded.bytes);
      this.currentBuffer = buffer;
      await this.engine.playLoop(buffer, settings.audio.bgmVolume);

      void loadAudioResource(nextTrack.url, settings.audio.cacheEnabled ? this.cache : null);
    } finally {
      this.hourlyFlowRunning = false;
    }

    return { currentTrack, nextTrack };
  }

  async triggerHourlyChime(settings: AppSettings, hour: number): Promise<void> {
    if (this.hourlyFlowRunning) {
      return;
    }

    this.hourlyFlowRunning = true;
    try {
      this.stopTownTunePreview();
      const bell = await this.getBellBuffer(settings.audio.cacheEnabled);
      await this.engine.playBellPlaylistFromBell(bell, settings.townTune.notes, getBellStrikeCount(hour), settings.audio.townTuneVolume);
    } finally {
      this.hourlyFlowRunning = false;
    }
  }

  async clearAudioCache(): Promise<void> {
    await this.cache.clear();
  }

  private async getBellBuffer(cacheEnabled = true): Promise<AudioBuffer> {
    if (this.bellBuffer) {
      return this.bellBuffer;
    }

    if (this.prepared?.bellBytes) {
      this.bellBuffer = await this.engine.decode(this.prepared.bellBytes);
      return this.bellBuffer;
    }

    const loaded = await loadAudioResource(BELL_URL, cacheEnabled ? this.cache : null);
    this.bellBuffer = await this.engine.decode(loaded.bytes);
    return this.bellBuffer;
  }
}

export function buildNextTrack(manifest: AudioManifest, settings: AppSettings, weather: IslandWeather, hour: number): AudioTrackRef {
  return selectTrack(manifest, settings.bgmVersion, weather, getNextHour(hour));
}

export { BELL_URL };
