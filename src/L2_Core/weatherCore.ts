import type { AppSettings, WeatherSnapshot } from './types';
import { resolveManualWeather, resolveWeatherAfterFailure } from '../L3_Business/weather/resolveWeatherSnapshot';
import { requestGeolocation } from '../L4_Atom/weatherApi/geolocation';
import { fetchOpenMeteoWeather } from '../L4_Atom/weatherApi/openMeteoClient';

export interface WeatherRefreshResult {
  settings: AppSettings;
  snapshot: WeatherSnapshot;
  error: string | null;
}

export async function refreshWeather(settings: AppSettings, now = new Date()): Promise<WeatherRefreshResult> {
  if (settings.weather.mode === 'manual') {
    return {
      settings,
      snapshot: resolveManualWeather(settings, now),
      error: null,
    };
  }

  try {
    const point = await requestGeolocation();
    const snapshot = await fetchOpenMeteoWeather(point.latitude, point.longitude, fetch, now);
    return {
      settings: {
        ...settings,
        weather: {
          ...settings.weather,
          lastAuto: snapshot,
        },
      },
      snapshot,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Weather refresh failed.';
    return {
      settings,
      snapshot: resolveWeatherAfterFailure(settings, now),
      error: message,
    };
  }
}
