import type { WeatherSnapshot } from '../types';
import { mapWeatherCode } from './mapWeatherCode';

export interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    precipitation?: number;
    rain?: number;
    snowfall?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
}

export async function fetchOpenMeteoWeather(
  latitude: number,
  longitude: number,
  fetcher: typeof fetch = fetch,
  now = new Date(),
): Promise<WeatherSnapshot> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,weather_code,precipitation,rain,snowfall');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '1');

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo failed: ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current ?? {};
  const weatherCode = current.weather_code ?? null;

  return {
    value: mapWeatherCode({
      weatherCode,
      precipitation: current.precipitation ?? null,
      rain: current.rain ?? null,
      snowfall: current.snowfall ?? null,
    }),
    locationLabel: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
    temperature: current.temperature_2m ?? null,
    temperatureMax: data.daily?.temperature_2m_max?.[0] ?? null,
    temperatureMin: data.daily?.temperature_2m_min?.[0] ?? null,
    weatherCode,
    updatedAt: now.toISOString(),
    source: 'open-meteo',
  };
}
