import type { AppSettings, ExportedConfig } from '../../L4_Atom/types';
import { BGM_VERSIONS, LANGUAGES, WEATHER_VALUES } from '../../L4_Atom/types';
import { createDefaultSettings } from './defaults';
import { sanitizeSettingsForStorage } from './sanitizeSensitiveConfig';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp01(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function pickString<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}

export function normalizeSettings(input: unknown, defaults = createDefaultSettings()): AppSettings {
  if (!isRecord(input)) {
    return defaults;
  }

  const weather = isRecord(input.weather) ? input.weather : {};
  const audio = isRecord(input.audio) ? input.audio : {};
  const townTune = isRecord(input.townTune) ? input.townTune : {};
  const time = isRecord(input.time) ? input.time : {};
  const background = isRecord(input.background) ? input.background : {};
  const mqtt = isRecord(input.mqtt) ? input.mqtt : {};

  const next: AppSettings = {
    ...defaults,
    schemaVersion: 1,
    language: pickString(input.language, LANGUAGES, defaults.language),
    onboardingCompleted: typeof input.onboardingCompleted === 'boolean' ? input.onboardingCompleted : defaults.onboardingCompleted,
    bgmVersion: pickString(input.bgmVersion, BGM_VERSIONS, defaults.bgmVersion),
    weather: {
      ...defaults.weather,
      mode: weather.mode === 'manual' ? 'manual' : 'auto',
      manualValue: pickString(weather.manualValue, WEATHER_VALUES, defaults.weather.manualValue),
      manualLocationLabel: typeof weather.manualLocationLabel === 'string' ? weather.manualLocationLabel : defaults.weather.manualLocationLabel,
      lastAuto: isRecord(weather.lastAuto) ? (weather.lastAuto as unknown as AppSettings['weather']['lastAuto']) : null,
    },
    audio: {
      ...defaults.audio,
      bgmVolume: clamp01(audio.bgmVolume, defaults.audio.bgmVolume),
      townTuneVolume: clamp01(audio.townTuneVolume, defaults.audio.townTuneVolume),
      hourlyFlowEnabled: typeof audio.hourlyFlowEnabled === 'boolean' ? audio.hourlyFlowEnabled : defaults.audio.hourlyFlowEnabled,
      preloadNextHour: true,
      cacheEnabled: typeof audio.cacheEnabled === 'boolean' ? audio.cacheEnabled : defaults.audio.cacheEnabled,
      fadeMs: typeof audio.fadeMs === 'number' ? Math.max(0, Math.floor(audio.fadeMs)) : defaults.audio.fadeMs,
    },
    townTune: {
      url: typeof townTune.url === 'string' ? townTune.url : null,
      title: typeof townTune.title === 'string' ? townTune.title : null,
      notes: Array.isArray(townTune.notes) ? (townTune.notes as AppSettings['townTune']['notes']) : [],
    },
    time: {
      hourCycle: time.hourCycle === '12h' ? '12h' : '24h',
      lunarEnabled: typeof time.lunarEnabled === 'boolean' ? time.lunarEnabled : defaults.time.lunarEnabled,
    },
    background: {
      kind: background.kind === 'solid' || background.kind === 'uploaded' ? background.kind : 'preset',
      solidColor: typeof background.solidColor === 'string' ? background.solidColor : defaults.background.solidColor,
      presetId: typeof background.presetId === 'string' ? background.presetId : defaults.background.presetId,
      uploadedImageId: typeof background.uploadedImageId === 'string' ? background.uploadedImageId : null,
      readabilityOverlay: typeof background.readabilityOverlay === 'boolean' ? background.readabilityOverlay : defaults.background.readabilityOverlay,
      presetPanEnabled: typeof background.presetPanEnabled === 'boolean' ? background.presetPanEnabled : defaults.background.presetPanEnabled,
    },
    mqtt: {
      ...defaults.mqtt,
      enabled: typeof mqtt.enabled === 'boolean' ? mqtt.enabled : defaults.mqtt.enabled,
      url: typeof mqtt.url === 'string' ? mqtt.url : defaults.mqtt.url,
      clientId: typeof mqtt.clientId === 'string' && mqtt.clientId ? mqtt.clientId : defaults.mqtt.clientId,
      username: typeof mqtt.username === 'string' ? mqtt.username : '',
      password: typeof mqtt.password === 'string' ? mqtt.password : '',
      saveCredentials: typeof mqtt.saveCredentials === 'boolean' ? mqtt.saveCredentials : false,
      baseTopic: typeof mqtt.baseTopic === 'string' ? mqtt.baseTopic : defaults.mqtt.baseTopic,
      qos: mqtt.qos === 1 ? 1 : 0,
      retainState: typeof mqtt.retainState === 'boolean' ? mqtt.retainState : defaults.mqtt.retainState,
      retainCommand: false,
    },
  };

  return sanitizeSettingsForStorage(next);
}

export function exportConfig(settings: AppSettings, now = new Date()): ExportedConfig {
  return {
    app: 'Animal-Crossing-Player',
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    settings,
  };
}

export function importConfig(input: unknown, defaults = createDefaultSettings()): { settings: AppSettings; warnings: string[] } {
  const warnings: string[] = [];

  if (!isRecord(input) || input.app !== 'Animal-Crossing-Player' || input.schemaVersion !== 1) {
    warnings.push('Unsupported config file.');
    return { settings: defaults, warnings };
  }

  return { settings: normalizeSettings(input.settings, defaults), warnings };
}
