import type { AppSettings, AudioManifest, AudioTrackRef, IslandWeather, LoadProgress, TownTuneNote } from './types';
import { BELL_URL, planInitialAudioLoad } from '../L3_Business/audio/planAudioLoad';
import { getNextHour, selectTrack } from '../L3_Business/audio/selectTrack';
import { createAudioCacheService, type AudioCacheService } from '../L4_Atom/storage/cacheStorageStore';
import { loadAudioResource } from '../L4_Atom/audio/audioBufferLoader';
import { WebAudioEngine } from '../L4_Atom/audio/webAudio';

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
    await this.engine.playLoop(this.currentBuffer, settings.audio.bgmVolume);
    return this.prepared.track;
  }

  setBgmVolume(volume: number): void {
    this.engine.setVolume(volume);
  }

  stop(): void {
    this.engine.stop();
  }

  async previewTownTune(notes: TownTuneNote[], volume: number): Promise<void> {
    if (notes.length === 0) {
      return;
    }
    await this.engine.playToneSequence(notes, volume);
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

    if (settings.townTune.notes.length > 0) {
      await this.engine.playToneSequence(settings.townTune.notes, settings.audio.townTuneVolume);
    }

    if (this.prepared?.bellBytes) {
      const bell = await this.engine.decode(this.prepared.bellBytes);
      await this.engine.playBufferOnce(bell, settings.audio.townTuneVolume);
    }

    const loaded = await loadAudioResource(currentTrack.url, settings.audio.cacheEnabled ? this.cache : null);
    const buffer = await this.engine.decode(loaded.bytes);
    await this.engine.playLoop(buffer, settings.audio.bgmVolume);

    if (settings.audio.preloadNextHour) {
      void loadAudioResource(nextTrack.url, settings.audio.cacheEnabled ? this.cache : null);
    }

    return { currentTrack, nextTrack };
  }

  async clearAudioCache(): Promise<void> {
    await this.cache.clear();
  }
}

export function buildNextTrack(manifest: AudioManifest, settings: AppSettings, weather: IslandWeather, hour: number): AudioTrackRef {
  return selectTrack(manifest, settings.bgmVersion, weather, getNextHour(hour));
}

export { BELL_URL };
