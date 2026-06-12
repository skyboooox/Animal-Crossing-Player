import type { TownTuneNote } from '../types';

export const TOWN_TUNE_STEP_MS = 250;
export const BELL_PLAYLIST_ITEM_GAP_SECONDS = 1;
export const TOWN_TUNE_NEXT_NOTE_AT_SECONDS = BELL_PLAYLIST_ITEM_GAP_SECONDS;
export const HOURLY_BGM_FADE_OUT_MS = 1500;
export const TOWN_TUNE_PREVIEW_DUCK_MULTIPLIER = 0.35;
export const TOWN_TUNE_PREVIEW_DUCK_FADE_MS = 160;

const BELL_BASE_FREQUENCY = 440;
const TOWN_TUNE_OCTAVE_MULTIPLIER = 2;

export interface TownTunePlaybackEvent {
  frequency: number | null;
  durationMs: number;
}

export interface TownTuneTimelineEntry {
  event: TownTunePlaybackEvent;
  note: boolean;
  startSeconds: number;
  durationSeconds: number;
  advanceSeconds: number;
}

export interface TownTuneTimeline {
  entries: TownTuneTimelineEntry[];
  totalAdvanceSeconds: number;
  audibleEndSeconds: number;
}

export type BellPlaylistEntry =
  | {
      kind: 'note';
      frequency: number;
      startSeconds: number;
      durationSeconds: number;
    }
  | {
      kind: 'strike';
      startSeconds: number;
      durationSeconds: number;
    };

export interface BellPlaylist {
  entries: BellPlaylistEntry[];
  totalAdvanceSeconds: number;
  audibleEndSeconds: number;
}

export function buildTownTunePlaybackEvents(notes: TownTuneNote[], stepMs = TOWN_TUNE_STEP_MS): TownTunePlaybackEvent[] {
  const events: TownTunePlaybackEvent[] = [];

  for (const note of notes) {
    if (note.kind === 'sustain') {
      const previousNote = [...events].reverse().find((event) => event.frequency !== null);
      if (previousNote) {
        previousNote.durationMs += stepMs;
      }
      continue;
    }

    events.push({
      frequency: note.kind === 'rest' ? null : note.frequency,
      durationMs: stepMs,
    });
  }

  return events;
}

export function buildTownTuneTimeline(
  events: TownTunePlaybackEvent[],
  unitSeconds: number,
  nextNoteAtSeconds = TOWN_TUNE_NEXT_NOTE_AT_SECONDS,
): TownTuneTimeline {
  const entries: TownTuneTimelineEntry[] = [];
  let cursorSeconds = 0;
  let audibleEndSeconds = 0;

  for (const event of events) {
    const units = Math.max(0, event.durationMs / TOWN_TUNE_STEP_MS);
    if (units <= 0) {
      continue;
    }

    const durationSeconds = units * unitSeconds;
    const advanceSeconds = units * nextNoteAtSeconds;
    const note = event.frequency !== null;
    entries.push({
      event,
      note,
      startSeconds: cursorSeconds,
      durationSeconds,
      advanceSeconds,
    });
    audibleEndSeconds = Math.max(audibleEndSeconds, cursorSeconds + (note ? durationSeconds : advanceSeconds));
    cursorSeconds += advanceSeconds;
  }

  return {
    entries,
    totalAdvanceSeconds: cursorSeconds,
    audibleEndSeconds: Math.max(audibleEndSeconds, cursorSeconds),
  };
}

export function buildBellPlaylist(options: {
  notes: TownTuneNote[];
  strikes: number;
  noteUnitSeconds: number;
  strikeDurationSeconds: number;
  nextItemAtSeconds?: number;
}): BellPlaylist {
  const nextItemAtSeconds = options.nextItemAtSeconds ?? BELL_PLAYLIST_ITEM_GAP_SECONDS;
  const timeline = buildTownTuneTimeline(buildTownTunePlaybackEvents(options.notes), options.noteUnitSeconds, nextItemAtSeconds);
  const entries: BellPlaylistEntry[] = timeline.entries.flatMap((entry) =>
    entry.note && entry.event.frequency !== null
      ? [
          {
            kind: 'note' as const,
            frequency: entry.event.frequency,
            startSeconds: entry.startSeconds,
            durationSeconds: entry.durationSeconds,
          },
        ]
      : [],
  );

  let cursorSeconds = timeline.totalAdvanceSeconds;
  let audibleEndSeconds = timeline.audibleEndSeconds;
  const strikeCount = Math.max(0, Math.floor(options.strikes));

  for (let index = 0; index < strikeCount; index += 1) {
    const startSeconds = cursorSeconds + index * nextItemAtSeconds;
    entries.push({
      kind: 'strike',
      startSeconds,
      durationSeconds: options.strikeDurationSeconds,
    });
    audibleEndSeconds = Math.max(audibleEndSeconds, startSeconds + options.strikeDurationSeconds);
  }

  cursorSeconds += strikeCount * nextItemAtSeconds;

  return {
    entries,
    totalAdvanceSeconds: cursorSeconds,
    audibleEndSeconds: Math.max(audibleEndSeconds, cursorSeconds),
  };
}

export function getBellPlaybackRate(frequency: number): number {
  return Math.max(0.1, (frequency * TOWN_TUNE_OCTAVE_MULTIPLIER) / BELL_BASE_FREQUENCY);
}

export function getBellStrikeCount(hour24: number): number {
  const strikes = hour24 % 12;
  return strikes === 0 ? 12 : strikes;
}
