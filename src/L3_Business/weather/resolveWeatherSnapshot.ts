import type { AppSettings, WeatherSnapshot } from '../../L4_Atom/types';
import { createFallbackWeatherSnapshot } from '../settings/defaults';

export function resolveManualWeather(settings: AppSettings, now = new Date()): WeatherSnapshot {
  return {
    value: settings.weather.manualValue,
    locationLabel: settings.weather.manualLocationLabel || 'Manual',
    temperature: null,
    temperatureMax: null,
    temperatureMin: null,
    weatherCode: null,
    updatedAt: now.toISOString(),
    source: 'manual',
  };
}

export function resolveWeatherAfterFailure(settings: AppSettings, now = new Date()): WeatherSnapshot {
  return settings.weather.lastAuto ?? createFallbackWeatherSnapshot(now);
}
