import { describe, expect, it } from 'vitest';
import {
  buildBellPlaylist,
  buildTownTunePlaybackEvents,
  buildTownTuneTimeline,
  getBellPlaybackRate,
  getBellStrikeCount,
  TOWN_TUNE_NEXT_NOTE_AT_SECONDS,
  TOWN_TUNE_STEP_MS,
} from '../../src/L4_Atom/audio/townTuneBell';
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

  it('matches the old project note table and random token support', () => {
    const result = parseNookNetUrl('https://nooknet.net/tunes?melody=g-G-R-s-z-a-b-c-d-e-f-A-B-C-D-E');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.notes[0].frequency).toBe(196);
      expect(result.value.notes[1].frequency).toBe(392);
      expect(result.value.notes[2].token).toBe('R');
      expect(result.value.notes[2].frequency).toEqual(expect.any(Number));
      expect(result.value.notes[3].kind).toBe('sustain');
    }
  });

  it('builds old-style bell-slice playback events', () => {
    const result = parseNookNetUrl('https://nooknet.net/tunes?melody=g-s-z-A-s-s-b-c-d-e-f-G-A-B-C-D');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const events = buildTownTunePlaybackEvents(result.value.notes);
      expect(events.slice(0, 4)).toEqual([
        { frequency: 196, durationMs: TOWN_TUNE_STEP_MS * 2 },
        { frequency: null, durationMs: TOWN_TUNE_STEP_MS },
        { frequency: 440, durationMs: TOWN_TUNE_STEP_MS * 3 },
        { frequency: 246.94, durationMs: TOWN_TUNE_STEP_MS },
      ]);
    }
  });

  it('uses old-style bell playback rate and strike count', () => {
    expect(getBellPlaybackRate(220)).toBe(1);
    expect(getBellPlaybackRate(440)).toBe(2);
    expect(getBellStrikeCount(0)).toBe(12);
    expect(getBellStrikeCount(13)).toBe(1);
    expect(getBellStrikeCount(23)).toBe(11);
  });

  it('starts overlapping bell notes after one second', () => {
    const timeline = buildTownTuneTimeline(
      [
        { frequency: 196, durationMs: TOWN_TUNE_STEP_MS },
        { frequency: 220, durationMs: TOWN_TUNE_STEP_MS },
      ],
      2,
    );

    expect(TOWN_TUNE_NEXT_NOTE_AT_SECONDS).toBe(1);
    expect(timeline.entries[0]).toMatchObject({ startSeconds: 0, durationSeconds: 2, advanceSeconds: TOWN_TUNE_NEXT_NOTE_AT_SECONDS });
    expect(timeline.entries[1]).toMatchObject({ startSeconds: TOWN_TUNE_NEXT_NOTE_AT_SECONDS, durationSeconds: 2 });
    expect(timeline.entries[1].startSeconds).toBeLessThan(timeline.entries[0].startSeconds + timeline.entries[0].durationSeconds);
  });

  it('appends hourly strikes to the same one-second playlist', () => {
    const playlist = buildBellPlaylist({
      notes: [
        { token: 'g', kind: 'note', frequency: 196 },
        { token: 'a', kind: 'note', frequency: 220 },
      ],
      strikes: 2,
      noteUnitSeconds: 2,
      strikeDurationSeconds: 2,
    });

    expect(playlist.entries).toMatchObject([
      { kind: 'note', startSeconds: 0, durationSeconds: 2 },
      { kind: 'note', startSeconds: 1, durationSeconds: 2 },
      { kind: 'strike', startSeconds: 2, durationSeconds: 2 },
      { kind: 'strike', startSeconds: 3, durationSeconds: 2 },
    ]);
    expect(playlist.entries[2].startSeconds).toBeLessThan(playlist.entries[1].startSeconds + playlist.entries[1].durationSeconds);
  });
});
