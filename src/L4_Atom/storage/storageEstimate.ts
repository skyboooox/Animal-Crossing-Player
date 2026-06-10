import type { CacheEstimate } from '../types';

export async function estimateBrowserStorage(): Promise<CacheEstimate> {
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  }
  return { usage: 0, quota: 0 };
}
