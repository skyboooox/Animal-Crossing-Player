import type { AppSettings, ExportedConfig } from './types';
import { createDefaultSettings } from '../L3_Business/settings/defaults';
import { exportConfig, importConfig, normalizeSettings } from '../L3_Business/settings/importExportConfig';
import { hasExportedPassword, sanitizeSettingsForStorage } from '../L3_Business/settings/sanitizeSensitiveConfig';
import { createLocalJsonStore } from '../L4_Atom/storage/localJsonStore';

const SETTINGS_KEY = 'animal-crossing-player.settings.v1';
const store = createLocalJsonStore<AppSettings>(SETTINGS_KEY);

export function loadSettings(): AppSettings {
  return normalizeSettings(store.load(), createDefaultSettings());
}

export function saveSettings(settings: AppSettings): void {
  store.save(sanitizeSettingsForStorage(settings));
}

export function clearSettings(): void {
  store.clear();
}

export function buildExportConfig(settings: AppSettings): ExportedConfig {
  return exportConfig(settings);
}

export function importSettingsFromJson(value: string, defaults = createDefaultSettings()) {
  return importConfig(JSON.parse(value), defaults);
}

export function exportNeedsPasswordConfirmation(settings: AppSettings): boolean {
  return hasExportedPassword(settings);
}
