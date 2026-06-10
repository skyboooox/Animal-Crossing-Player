import type { AudioManifest, AudioTrackRef, BgmVersion, IslandWeather } from '../../L4_Atom/types';
import { BGM_VERSIONS, WEATHER_VALUES } from '../../L4_Atom/types';

export function assertHour(hour: number): number {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error('Hour must be 0..23.');
  }
  return hour;
}

export function isBgmVersion(value: string): value is BgmVersion {
  return BGM_VERSIONS.includes(value as BgmVersion);
}

export function isIslandWeather(value: string): value is IslandWeather {
  return WEATHER_VALUES.includes(value as IslandWeather);
}

export function selectTrack(
  manifest: AudioManifest,
  version: BgmVersion,
  requestedWeather: IslandWeather,
  hour: number,
): AudioTrackRef {
  const safeHour = assertHour(hour);
  const versionManifest = manifest[version];

  if (!versionManifest) {
    throw new Error(`Missing BGM version: ${version}`);
  }

  const requestedTracks = versionManifest[requestedWeather];
  if (requestedTracks?.[safeHour]) {
    return {
      version,
      weather: requestedWeather,
      requestedWeather,
      hour: safeHour,
      url: requestedTracks[safeHour],
      fallbackUsed: false,
    };
  }

  const sunnyTracks = versionManifest.Sunny;
  if (sunnyTracks?.[safeHour]) {
    return {
      version,
      weather: 'Sunny',
      requestedWeather,
      hour: safeHour,
      url: sunnyTracks[safeHour],
      fallbackUsed: true,
    };
  }

  throw new Error(`Missing track for ${version} ${requestedWeather} hour ${safeHour}.`);
}

export function getNextHour(hour: number): number {
  return (assertHour(hour) + 1) % 24;
}
