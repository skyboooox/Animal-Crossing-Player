import type { AppSettings, AudioManifest, AudioTrackRef, IslandWeather, LoadProgress } from '../../L4_Atom/types';
import { getPublicAssetUrl } from '../../L4_Atom/utils/publicAssetUrl';
import { selectTrack, getNextHour } from './selectTrack';

export const BELL_URL = getPublicAssetUrl('assets/bell.mp3');

export interface AudioLoadItem {
  kind: 'bgm' | 'bell' | 'townTune';
  label: string;
  url: string | null;
}

export interface InitialAudioPlan {
  currentTrack: AudioTrackRef;
  nextTrack: AudioTrackRef;
  items: AudioLoadItem[];
}

export function planInitialAudioLoad(
  manifest: AudioManifest,
  settings: AppSettings,
  weather: IslandWeather,
  hour: number,
): InitialAudioPlan {
  const currentTrack = selectTrack(manifest, settings.bgmVersion, weather, hour);
  const nextTrack = selectTrack(manifest, settings.bgmVersion, weather, getNextHour(hour));
  const items: AudioLoadItem[] = [
    { kind: 'bgm', label: `${settings.bgmVersion} ${currentTrack.weather} ${hour}:00`, url: currentTrack.url },
    { kind: 'bell', label: 'Bell', url: BELL_URL },
  ];

  if (settings.townTune.notes.length > 0) {
    items.push({ kind: 'townTune', label: settings.townTune.title ?? 'Town tune', url: null });
  }

  return { currentTrack, nextTrack, items };
}

export function progressForItem(index: number, total: number, label: string, status: LoadProgress['status']): LoadProgress {
  return {
    done: Math.min(index, total),
    total,
    label,
    status,
  };
}
