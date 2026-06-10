import { describe, expect, it } from 'vitest';
import { mapOpenMeteoWeather } from '../../src/L3_Business/weather/mapOpenMeteoWeather';
import { formatClock } from '../../src/L3_Business/time/formatClock';
import { formatLunarDate } from '../../src/L3_Business/time/formatLunarDate';

describe('weather and time', () => {
  it('maps snow before rain', () => {
    expect(mapOpenMeteoWeather({ weatherCode: 71, precipitation: 1, rain: 1, snowfall: 0.2 })).toBe('Snowy');
  });

  it('maps rain and clear weather', () => {
    expect(mapOpenMeteoWeather({ weatherCode: 61, precipitation: 0, rain: 0, snowfall: 0 })).toBe('Rainy');
    expect(mapOpenMeteoWeather({ weatherCode: 0, precipitation: 0, rain: 0, snowfall: 0 })).toBe('Sunny');
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
