import type { AppSettings, WeatherSnapshot } from './types';
import { resolveWeatherAfterFailure } from '../L3_Business/weather/resolveWeatherSnapshot';
import { requestGeolocation } from '../L4_Atom/weatherApi/geolocation';
import { fetchOpenMeteoGeocodedPlace } from '../L4_Atom/weatherApi/openMeteoGeocodingClient';
import { fetchOpenMeteoWeather } from '../L4_Atom/weatherApi/openMeteoClient';
import { fetchReverseGeocodedLocationLabel } from '../L4_Atom/weatherApi/reverseGeocoding';

export interface WeatherRefreshResult {
  settings: AppSettings;
  snapshot: WeatherSnapshot;
  error: string | null;
}

async function fetchWeatherByPoint(latitude: number, longitude: number, settings: AppSettings, now: Date): Promise<WeatherSnapshot> {
  const [weatherSnapshot, locationLabel] = await Promise.all([
    fetchOpenMeteoWeather(latitude, longitude, fetch, now),
    fetchReverseGeocodedLocationLabel(latitude, longitude, fetch, settings.language),
  ]);
  return locationLabel ? { ...weatherSnapshot, locationLabel } : weatherSnapshot;
}

export async function refreshWeather(settings: AppSettings, now = new Date()): Promise<WeatherRefreshResult> {
  if (settings.weather.mode === 'manual') {
    const query = settings.weather.manualLocationLabel.trim();
    if (!query) {
      return {
        settings,
        snapshot: resolveWeatherAfterFailure(settings, now),
        error: 'Manual location is required.',
      };
    }

    try {
      const place = await fetchOpenMeteoGeocodedPlace(query, fetch, settings.language);
      if (!place) {
        throw new Error('Manual location was not found.');
      }
      const weatherSnapshot = await fetchOpenMeteoWeather(place.latitude, place.longitude, fetch, now);
      const snapshot = { ...weatherSnapshot, locationLabel: place.label };
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

  try {
    const point = await requestGeolocation();
    const snapshot = await fetchWeatherByPoint(point.latitude, point.longitude, settings, now);
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
