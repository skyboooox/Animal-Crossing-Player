import { describe, expect, it } from 'vitest';
import { createInitialRuntime } from '../../src/L2_Core/appState';
import { skipWithDefaults } from '../../src/L2_Core/onboardingCore';
import { createDefaultSettings, getEffectiveWeather } from '../../src/L3_Business/settings/defaults';

describe('app state startup runtime', () => {
  it('opens the startup audio prompt for completed onboarding only', () => {
    const defaults = createDefaultSettings();

    expect(createInitialRuntime(defaults).startupAudioPromptOpen).toBe(false);
    expect(createInitialRuntime({ ...defaults, onboardingCompleted: true }).startupAudioPromptOpen).toBe(true);
  });

  it('skips first setup with default settings', () => {
    const defaults = createDefaultSettings();
    const settings = {
      ...defaults,
      language: 'zh-CN' as const,
      bgmVersion: 'Wild World (DS 2005)' as const,
      townTune: {
        url: 'https://nooknet.net/tunes?melody=g-s-z-A-s-s-b-c-d-e-f-G-A-B-C-D',
        title: 'Saved tune',
        notes: [{ token: 'g', kind: 'note' as const, frequency: 196 }],
      },
    };

    const result = skipWithDefaults(createInitialRuntime(settings), defaults);

    expect(result.settings).toEqual(defaults);
    expect(result.runtime.onboardingStep).toBe('audioLoading');
  });

  it('uses manual weather mode as a manual location source, not a direct weather override', () => {
    const settings = createDefaultSettings();
    settings.weather.mode = 'manual';
    settings.weather.manualValue = 'Snowy';
    settings.weather.manualLocationLabel = 'Hong Kong';

    const weather = getEffectiveWeather(settings, new Date('2026-06-09T12:00:00Z'));

    expect(weather.value).toBe('Sunny');
    expect(weather.locationLabel).toBe('Hong Kong');
    expect(weather.source).toBe('fallback');
  });
});
