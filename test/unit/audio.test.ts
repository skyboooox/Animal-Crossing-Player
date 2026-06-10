import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AudioManifest } from '../../src/L2_Core/types';
import { BGM_VERSIONS, WEATHER_VALUES } from '../../src/L2_Core/types';
import { planInitialAudioLoad } from '../../src/L3_Business/audio/planAudioLoad';
import { getNextHour, selectTrack } from '../../src/L3_Business/audio/selectTrack';
import { createDefaultSettings } from '../../src/L3_Business/settings/defaults';

const manifest = JSON.parse(readFileSync('public/assets/audio.json', 'utf8')) as AudioManifest;

describe('audio manifest and selection', () => {
  it('lists four BGM versions from the real manifest', () => {
    expect(Object.keys(manifest)).toEqual([...BGM_VERSIONS]);
  });

  it('has 24 hourly tracks for present weather arrays', () => {
    for (const version of BGM_VERSIONS) {
      for (const weather of WEATHER_VALUES) {
        const tracks = manifest[version][weather];
        if (tracks) {
          expect(tracks).toHaveLength(24);
        }
      }
    }
  });

  it('falls Wild World rainy and snowy tracks back to Sunny', () => {
    const rainy = selectTrack(manifest, 'Wild World (DS 2005)', 'Rainy', 7);
    const snowy = selectTrack(manifest, 'Wild World (DS 2005)', 'Snowy', 21);
    expect(rainy.weather).toBe('Sunny');
    expect(rainy.requestedWeather).toBe('Rainy');
    expect(rainy.fallbackUsed).toBe(true);
    expect(snowy.weather).toBe('Sunny');
    expect(snowy.fallbackUsed).toBe(true);
  });

  it('wraps next hour across midnight', () => {
    expect(getNextHour(23)).toBe(0);
  });

  it('plans current BGM and bell as first batch', () => {
    const settings = createDefaultSettings();
    const plan = planInitialAudioLoad(manifest, settings, 'Sunny', 12);
    expect(plan.items.map((item) => item.kind)).toEqual(['bgm', 'bell']);
    expect(plan.currentTrack.hour).toBe(12);
    expect(plan.nextTrack.hour).toBe(13);
  });
});
