import { mapWeatherCode } from '../../L4_Atom/weatherApi/mapWeatherCode';
import type { IslandWeather } from '../../L4_Atom/types';

export interface OpenMeteoWeatherInput {
  weatherCode: number | null;
  precipitation: number | null;
  rain: number | null;
  snowfall: number | null;
}

export function mapOpenMeteoWeather(input: OpenMeteoWeatherInput): IslandWeather {
  return mapWeatherCode(input);
}
