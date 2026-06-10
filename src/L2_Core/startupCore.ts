import type { AppState } from './types';
import { createInitialAppState } from './appState';
import { loadSettings } from './settingsCore';
import { loadAudioManifest } from '../L4_Atom/assetManifest/loadAudioManifest';

export async function bootstrapApp(): Promise<AppState> {
  const settings = loadSettings();
  const manifest = await loadAudioManifest();
  return createInitialAppState(settings, manifest);
}
