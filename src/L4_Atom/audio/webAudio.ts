import type { TownTuneNote } from '../types';

type AudioContextCtor = typeof AudioContext;

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
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = volume;
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

  setVolume(volume: number): void {
    if (this.currentGain) {
      this.currentGain.gain.value = volume;
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

  async playToneSequence(notes: TownTuneNote[], volume: number): Promise<void> {
    const context = await this.ensureContext();
    const stepSeconds = 0.22;
    const now = context.currentTime;

    notes.forEach((note, index) => {
      if (note.frequency === null) {
        return;
      }
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * stepSeconds;
      oscillator.type = 'sine';
      oscillator.frequency.value = note.frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + stepSeconds * 0.9);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + stepSeconds);
    });

    await new Promise((resolve) => setTimeout(resolve, Math.ceil(notes.length * stepSeconds * 1000)));
  }
}
