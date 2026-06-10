import type { AudioManifest } from '../types';

export async function loadAudioManifest(fetcher: typeof fetch = fetch): Promise<AudioManifest> {
  const response = await fetcher('/assets/audio.json');
  if (!response.ok) {
    throw new Error(`Failed to load audio manifest: ${response.status}`);
  }
  return (await response.json()) as AudioManifest;
}

export function listBgmVersions(manifest: AudioManifest): string[] {
  return Object.keys(manifest);
}
