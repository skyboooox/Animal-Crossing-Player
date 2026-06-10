import { describe, expect, it } from 'vitest';
import { parseNookNetUrl, TOWN_TUNE_ERRORS } from '../../src/L3_Business/townTune/parseNookNetUrl';

describe('town tune parser', () => {
  it('parses NookNet melody URLs into 16 notes', () => {
    const result = parseNookNetUrl('https://nooknet.net/tunes?melody=D-D-B-E-D-s-D-D-B-E-D-B-C-B-A-G&title=Oto%20Melody');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Oto Melody');
      expect(result.value.notes).toHaveLength(16);
      expect(result.value.notes[5].kind).toBe('sustain');
    }
  });

  it('rejects non NookNet URLs', () => {
    const result = parseNookNetUrl('https://example.com/tunes?melody=a-b-c-d-e-f-g-A-B-C-D-E-F-G-z-z');
    expect(result).toEqual({ ok: false, error: TOWN_TUNE_ERRORS.unsupportedUrl });
  });

  it('rejects compact URLs without melody=', () => {
    const result = parseNookNetUrl('https://nooknet.net/tunes?t=abc');
    expect(result).toEqual({ ok: false, error: TOWN_TUNE_ERRORS.compactMissingMelody });
  });
});
