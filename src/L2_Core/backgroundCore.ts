import type { AppSettings, UploadedBackground } from './types';
import { resolveBackground } from '../L3_Business/background/resolveBackground';
import { deleteUploadedBackground, loadUploadedBackground, saveUploadedBackground } from '../L4_Atom/storage/indexedDbStore';
import { createId } from '../L4_Atom/utils/ids';

export async function storeUploadedBackground(file: File, now = new Date()): Promise<UploadedBackground> {
  const background: UploadedBackground = {
    id: createId('bg'),
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: now.toISOString(),
    blob: file,
  };
  await saveUploadedBackground(background);
  return background;
}

export async function createUploadedBackgroundUrl(settings: AppSettings): Promise<string | null> {
  const id = settings.background.uploadedImageId;
  if (!id) {
    return null;
  }
  const uploaded = await loadUploadedBackground(id);
  return uploaded ? URL.createObjectURL(uploaded.blob) : null;
}

export async function clearUploadedBackground(settings: AppSettings): Promise<AppSettings> {
  if (settings.background.uploadedImageId) {
    await deleteUploadedBackground(settings.background.uploadedImageId);
  }
  return {
    ...settings,
    background: {
      ...settings.background,
      kind: 'preset',
      uploadedImageId: null,
    },
  };
}

export { resolveBackground };
