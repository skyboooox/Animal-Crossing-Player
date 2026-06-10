import type { UploadedBackground } from '../types';

const DB_NAME = 'animal-crossing-player';
const DB_VERSION = 1;
const BACKGROUND_STORE = 'uploadedBackgrounds';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BACKGROUND_STORE)) {
        db.createObjectStore(BACKGROUND_STORE, { keyPath: 'id' });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveUploadedBackground(background: UploadedBackground): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BACKGROUND_STORE, 'readwrite');
    tx.objectStore(BACKGROUND_STORE).put(background);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadUploadedBackground(id: string): Promise<UploadedBackground | null> {
  const db = await openDb();
  const result = await new Promise<UploadedBackground | null>((resolve, reject) => {
    const tx = db.transaction(BACKGROUND_STORE, 'readonly');
    const request = tx.objectStore(BACKGROUND_STORE).get(id);
    request.onsuccess = () => resolve((request.result as UploadedBackground | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

export async function deleteUploadedBackground(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BACKGROUND_STORE, 'readwrite');
    tx.objectStore(BACKGROUND_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
