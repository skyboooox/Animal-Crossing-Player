import type { LoadProgress } from '../types';
import type { AudioCacheService } from '../storage/cacheStorageStore';

export interface LoadedAudioResource {
  url: string;
  cached: boolean;
  bytes: ArrayBuffer;
}

export async function loadAudioResource(
  url: string,
  cache: AudioCacheService | null,
  onProgress?: (progress: LoadProgress) => void,
): Promise<LoadedAudioResource> {
  onProgress?.({ done: 0, total: 1, label: url, status: 'checkingCache' });

  const cachedResponse = await cache?.get(url);
  if (cachedResponse) {
    onProgress?.({ done: 1, total: 1, label: url, status: 'cached' });
    return { url, cached: true, bytes: await cachedResponse.arrayBuffer() };
  }

  onProgress?.({ done: 0, total: 1, label: url, status: 'downloading' });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const clone = response.clone();
  const bytes = await response.arrayBuffer();
  await cache?.put(url, clone).catch(() => undefined);
  onProgress?.({ done: 1, total: 1, label: url, status: 'ready' });
  return { url, cached: false, bytes };
}
