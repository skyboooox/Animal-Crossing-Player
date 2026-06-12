import type { AppSettings, WeatherSnapshot } from '../../L4_Atom/types';
import { createFallbackWeatherSnapshot } from '../settings/defaults';

export function resolveManualWeather(settings: AppSettings, now = new Date()): WeatherSnapshot {
  const fallback = createFallbackWeatherSnapshot(now);
  return settings.weather.lastAuto ?? { ...fallback, locationLabel: settings.weather.manualLocationLabel || 'Manual' };
}

export function resolveWeatherAfterFailure(settings: AppSettings, now = new Date()): WeatherSnapshot {
  if (settings.weather.mode === 'manual') {
    return resolveManualWeather(settings, now);
  }

  return settings.weather.lastAuto ?? createFallbackWeatherSnapshot(now);
}
