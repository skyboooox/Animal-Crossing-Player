import { safeJsonParse } from '../utils/url';

export interface LocalJsonStore<T> {
  load(): T | null;
  save(value: T): void;
  clear(): void;
}

export function createLocalJsonStore<T>(key: string): LocalJsonStore<T> {
  return {
    load() {
      if (typeof localStorage === 'undefined') {
        return null;
      }

      const value = localStorage.getItem(key);
      return value ? (safeJsonParse(value) as T | null) : null;
    },
    save(value) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    },
    clear() {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    },
  };
}
