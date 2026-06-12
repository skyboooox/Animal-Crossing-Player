import type { AppSettings, WeatherSnapshot } from '../../L4_Atom/types';
import { createMqttClientId } from '../../L4_Atom/utils/ids';

export function createFallbackWeatherSnapshot(now = new Date()): WeatherSnapshot {
  return {
    value: 'Sunny',
    locationLabel: 'Fallback',
    temperature: null,
    temperatureMax: null,
    temperatureMin: null,
    weatherCode: null,
    updatedAt: now.toISOString(),
    source: 'fallback',
  };
}

export function createDefaultSettings(): AppSettings {
  return {
    schemaVersion: 1,
    language: 'en',
    onboardingCompleted: false,
    bgmVersion: 'New Horizons (Switch 2021)',
    weather: {
      mode: 'auto',
      manualValue: 'Sunny',
      manualLocationLabel: '',
      lastAuto: null,
    },
    audio: {
      bgmVolume: 0.7,
      townTuneVolume: 0.8,
      hourlyFlowEnabled: true,
      preloadNextHour: true,
      cacheEnabled: true,
      fadeMs: 1500,
    },
    townTune: {
      url: null,
      title: null,
      notes: [],
    },
    time: {
      hourCycle: '24h',
      lunarEnabled: false,
    },
    background: {
      kind: 'preset',
      solidColor: '#E8F6EF',
      presetId: '0',
      uploadedImageId: null,
      readabilityOverlay: true,
      presetPanEnabled: true,
    },
    mqtt: {
      enabled: false,
      url: 'ws://localhost:9001',
      clientId: createMqttClientId(),
      username: '',
      password: '',
      saveCredentials: false,
      baseTopic: 'ac-player/v1/{clientId}',
      qos: 0,
      retainState: true,
      retainCommand: false,
    },
  };
}

export function getEffectiveWeather(settings: AppSettings, now = new Date()): WeatherSnapshot {
  if (settings.weather.mode === 'manual') {
    const fallback = createFallbackWeatherSnapshot(now);
    const last = settings.weather.lastAuto;
    return {
      ...fallback,
      locationLabel: last?.locationLabel ?? (settings.weather.manualLocationLabel || 'Manual'),
      value: last?.value ?? fallback.value,
      temperature: last?.temperature ?? fallback.temperature,
      temperatureMax: last?.temperatureMax ?? fallback.temperatureMax,
      temperatureMin: last?.temperatureMin ?? fallback.temperatureMin,
      weatherCode: last?.weatherCode ?? fallback.weatherCode,
      updatedAt: last?.updatedAt ?? fallback.updatedAt,
      source: last?.source ?? fallback.source,
    };
  }

  return settings.weather.lastAuto ?? createFallbackWeatherSnapshot(now);
}
