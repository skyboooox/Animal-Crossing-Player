import { describe, expect, it } from 'vitest';
import type { Language } from '../../src/L2_Core/types';
import { LANGUAGES } from '../../src/L2_Core/types';
import { formatLocationLabelValue, getLanguageOptions, interpolate, toSupportedLanguage, type UiText } from '../../src/L1_Entry/i18n';
import en from '../../public/locales/en.json';
import zhCN from '../../public/locales/zh-CN.json';

const locales: Record<Language, UiText> = {
  en,
  'zh-CN': zhCN,
};

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, nested]) => flattenKeys(nested, prefix ? `${prefix}.${key}` : key));
}

function flattenEntries(value: unknown, prefix = ''): Array<[string, unknown]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [[prefix, value]];
  }

  return Object.entries(value).flatMap(([key, nested]) => flattenEntries(nested, prefix ? `${prefix}.${key}` : key));
}

describe('i18n locale files', () => {
  it('keeps every registered language backed by a public locale JSON file', () => {
    expect(Object.keys(locales)).toEqual([...LANGUAGES]);
    expect(getLanguageOptions().map((option) => option.key)).toEqual([...LANGUAGES]);
  });

  it('keeps English and Simplified Chinese locale keys aligned', () => {
    expect(flattenKeys(locales['zh-CN']).sort()).toEqual(flattenKeys(locales.en).sort());
  });

  it('does not keep empty UI copy in locale files', () => {
    for (const locale of Object.values(locales)) {
      for (const [, value] of flattenEntries(locale)) {
        expect(value).not.toBe('');
      }
    }
  });

  it('falls back to English for unsupported language values', () => {
    expect(toSupportedLanguage('zh-CN')).toBe('zh-CN');
    expect(toSupportedLanguage('fr')).toBe('en');
  });

  it('interpolates locale templates without component-level string assembly', () => {
    expect(interpolate(en.settings.island.presetBackground, { id: 2 })).toBe('Preset background 2');
    expect(interpolate(zhCN.settings.island.presetBackground, { id: 2 })).toBe('预设背景 2');
  });

  it('does not surface coordinate labels in weather location copy', () => {
    expect(formatLocationLabelValue(en.weather.locationLabels, '22.30, 114.20')).toBe('Local');
    expect(formatLocationLabelValue(zhCN.weather.locationLabels, '22.30, 114.20')).toBe('本地天气');
  });
});
