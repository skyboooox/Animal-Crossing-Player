import type { IslandWeather } from '../types';

const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

export interface WeatherCodeInput {
  weatherCode: number | null;
  precipitation: number | null;
  rain: number | null;
  snowfall: number | null;
}

export function mapWeatherCode(input: WeatherCodeInput): IslandWeather {
  if ((input.snowfall ?? 0) > 0 || (input.weatherCode !== null && SNOW_CODES.has(input.weatherCode))) {
    return 'Snowy';
  }
  if (
    (input.rain ?? 0) > 0 ||
    (input.precipitation ?? 0) > 0 ||
    (input.weatherCode !== null && RAIN_CODES.has(input.weatherCode))
  ) {
    return 'Rainy';
  }
  return 'Sunny';
}
