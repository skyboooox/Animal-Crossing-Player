import type { CacheEstimate } from '../types';

export interface AudioCacheService {
  get(url: string): Promise<Response | null>;
  put(url: string, response: Response): Promise<void>;
  deleteMany(urls: string[]): Promise<void>;
  clear(): Promise<void>;
  estimate(): Promise<CacheEstimate>;
}

const CACHE_NAME = 'acp-audio-v1';

export function createAudioCacheService(): AudioCacheService {
  async function openCache(): Promise<Cache | null> {
    if (typeof caches === 'undefined') {
      return null;
    }
    return caches.open(CACHE_NAME);
  }

  return {
    async get(url) {
      const cache = await openCache();
      return cache ? ((await cache.match(new Request(url))) ?? null) : null;
    },
    async put(url, response) {
      const cache = await openCache();
      if (cache) {
        await cache.put(new Request(url), response);
      }
    },
    async deleteMany(urls) {
      const cache = await openCache();
      if (!cache) {
        return;
      }
      await Promise.all(urls.map((url) => cache.delete(new Request(url))));
    },
    async clear() {
      if (typeof caches !== 'undefined') {
        await caches.delete(CACHE_NAME);
      }
    },
    async estimate() {
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
      }
      return { usage: 0, quota: 0 };
    },
  };
}
