import type { AudioManifest } from '../types';
import { getPublicAssetUrl } from '../utils/publicAssetUrl';

function normalizeManifestUrls(manifest: AudioManifest): AudioManifest {
  return Object.fromEntries(
    Object.entries(manifest).map(([version, weatherMap]) => [
      version,
      Object.fromEntries(
        Object.entries(weatherMap).map(([weather, tracks]) => [
          weather,
          tracks?.map((track) => getPublicAssetUrl(track)),
        ]),
      ),
    ]),
  ) as AudioManifest;
}

export async function loadAudioManifest(fetcher: typeof fetch = fetch): Promise<AudioManifest> {
  const response = await fetcher(getPublicAssetUrl('assets/audio.json'));
  if (!response.ok) {
    throw new Error(`Failed to load audio manifest: ${response.status}`);
  }
  return normalizeManifestUrls((await response.json()) as AudioManifest);
}

export function listBgmVersions(manifest: AudioManifest): string[] {
  return Object.keys(manifest);
}
