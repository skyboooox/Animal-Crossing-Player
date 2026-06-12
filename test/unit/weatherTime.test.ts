import { afterEach, describe, expect, it, vi } from 'vitest';
import { refreshWeather } from '../../src/L2_Core/weatherCore';
import { mapOpenMeteoWeather } from '../../src/L3_Business/weather/mapOpenMeteoWeather';
import { formatClock } from '../../src/L3_Business/time/formatClock';
import { formatLunarDate } from '../../src/L3_Business/time/formatLunarDate';
import { createDefaultSettings } from '../../src/L3_Business/settings/defaults';
import { fetchOpenMeteoGeocodedPlace, formatGeocodedPlaceLabel } from '../../src/L4_Atom/weatherApi/openMeteoGeocodingClient';
import { fetchOpenMeteoWeather } from '../../src/L4_Atom/weatherApi/openMeteoClient';
import { fetchReverseGeocodedLocationLabel, pickReverseGeocodedLocationName } from '../../src/L4_Atom/weatherApi/reverseGeocoding';

describe('weather and time', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps snow before rain', () => {
    expect(mapOpenMeteoWeather({ weatherCode: 71, precipitation: 1, rain: 1, snowfall: 0.2 })).toBe('Snowy');
  });

  it('maps rain and clear weather', () => {
    expect(mapOpenMeteoWeather({ weatherCode: 61, precipitation: 0, rain: 0, snowfall: 0 })).toBe('Rainy');
    expect(mapOpenMeteoWeather({ weatherCode: 0, precipitation: 0, rain: 0, snowfall: 0 })).toBe('Sunny');
  });

  it('uses readable location names for automatic weather snapshots', async () => {
    const weatherFetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          timezone: 'Asia/Hong_Kong',
          current: { temperature_2m: 26, weather_code: 0, precipitation: 0, rain: 0, snowfall: 0 },
          daily: { temperature_2m_max: [29], temperature_2m_min: [23] },
        }),
        { status: 200 },
      );

    const snapshot = await fetchOpenMeteoWeather(22.3, 114.2, weatherFetcher, new Date('2026-06-09T12:00:00Z'));

    expect(snapshot.locationLabel).toBe('Hong Kong');
    expect(snapshot.locationLabel).not.toContain(',');
  });

  it('picks a concrete reverse-geocoded place name', async () => {
    let requestedFormat: string | null = null;
    const geocodeFetcher: typeof fetch = async (input, init) => {
      const requestedUrl = input instanceof URL ? input : new URL(String(input));
      requestedFormat = requestedUrl.searchParams.get('format');
      expect(init?.headers).toMatchObject({ 'Accept-Language': 'zh-CN' });
      return new Response(JSON.stringify({ address: { city: '香港', country: '中国' }, name: '中西区' }), { status: 200 });
    };

    await expect(fetchReverseGeocodedLocationLabel(22.3, 114.2, geocodeFetcher, 'zh-CN')).resolves.toBe('香港');
    expect(requestedFormat).toBe('jsonv2');
    expect(pickReverseGeocodedLocationName({ display_name: 'Hong Kong, China' })).toBe('Hong Kong');
  });

  it('resolves a manually specified weather location before fetching weather', async () => {
    const requests: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = input instanceof URL ? input : new URL(String(input));
      requests.push(url.hostname);
      if (url.hostname === 'geocoding-api.open-meteo.com') {
        expect(url.searchParams.get('name')).toBe('Hong Kong');
        expect(url.searchParams.get('language')).toBe('en');
        return new Response(
          JSON.stringify({
            results: [{ name: 'Hong Kong', country: 'China', latitude: 22.3, longitude: 114.2 }],
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          timezone: 'Asia/Hong_Kong',
          current: { temperature_2m: 24, weather_code: 61, precipitation: 0, rain: 1, snowfall: 0 },
          daily: { temperature_2m_max: [28], temperature_2m_min: [22] },
        }),
        { status: 200 },
      );
    });

    const settings = createDefaultSettings();
    settings.weather.mode = 'manual';
    settings.weather.manualLocationLabel = 'Hong Kong';

    const result = await refreshWeather(settings, new Date('2026-06-09T12:00:00Z'));

    expect(result.error).toBeNull();
    expect(result.snapshot.value).toBe('Rainy');
    expect(result.snapshot.locationLabel).toBe('Hong Kong, China');
    expect(result.settings.weather.lastAuto?.locationLabel).toBe('Hong Kong, China');
    expect(requests).toEqual(['geocoding-api.open-meteo.com', 'api.open-meteo.com']);
  });

  it('requires a manual weather location before refresh', async () => {
    const settings = createDefaultSettings();
    settings.weather.mode = 'manual';
    settings.weather.manualLocationLabel = '';

    const result = await refreshWeather(settings, new Date('2026-06-09T12:00:00Z'));

    expect(result.error).toBe('Manual location is required.');
    expect(result.snapshot.locationLabel).toBe('Manual');
  });

  it('looks up manually specified locations with Open-Meteo geocoding', async () => {
    const fetcher: typeof fetch = async (input) => {
      const url = input instanceof URL ? input : new URL(String(input));
      expect(url.searchParams.get('name')).toBe('Paris');
      return new Response(
        JSON.stringify({
          results: [{ name: 'Paris', admin1: 'Ile-de-France', country: 'France', latitude: 48.85, longitude: 2.35 }],
        }),
        { status: 200 },
      );
    };

    await expect(fetchOpenMeteoGeocodedPlace('Paris', fetcher, 'en')).resolves.toEqual({
      latitude: 48.85,
      longitude: 2.35,
      label: 'Paris, Ile-de-France, France',
    });
    expect(formatGeocodedPlaceLabel({ name: 'Paris', admin1: 'Paris', country: 'France' })).toBe('Paris, France');
  });

  it('formats 24h and 12h clock', () => {
    const date = new Date('2026-06-09T00:05:00');
    expect(formatClock(date, '24h')).toContain('00:05');
    expect(formatClock(date, '12h')).toContain('12:05');
  });

  it('formats short lunar date', () => {
    const date = new Date('2026-06-09T12:00:00');
    expect(formatLunarDate(date, 'en')).toContain('Lunar');
    expect(formatLunarDate(date, 'zh-CN').length).toBeGreaterThan(1);
  });
});
