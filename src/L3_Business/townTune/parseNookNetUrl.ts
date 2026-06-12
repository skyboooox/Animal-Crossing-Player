import type { TownTuneNote, TownTuneSettings } from '../../L4_Atom/types';
import { err, ok, type Result } from '../../L4_Atom/utils/result';

const FREQUENCIES: Record<string, number> = {
  g: 196.0,
  a: 220.0,
  b: 246.94,
  c: 261.63,
  d: 293.66,
  e: 329.63,
  f: 349.23,
  G: 392.0,
  A: 440.0,
  B: 493.88,
  C: 523.25,
  D: 587.33,
  E: 659.25,
};
const RANDOM_POOL = Object.values(FREQUENCIES);

export const TOWN_TUNE_ERRORS = {
  unsupportedUrl: 'Only NookNet tune URLs are supported.',
  missingMelody: 'The URL must include a melody parameter.',
  compactMissingMelody: 'Please paste a NookNet URL that includes melody=.',
  invalidLength: 'The melody must contain 16 notes.',
  unsupportedToken: 'Unsupported note token.',
} as const;

function mapToken(token: string, previousFrequency: number | null): TownTuneNote {
  if (token === 'z') {
    return { token, kind: 'rest', frequency: null };
  }
  if (token === 's') {
    return { token, kind: 'sustain', frequency: previousFrequency };
  }
  if (token === 'R') {
    return { token, kind: 'note', frequency: RANDOM_POOL[Math.floor(Math.random() * RANDOM_POOL.length)] };
  }
  return { token, kind: 'note', frequency: FREQUENCIES[token] };
}

export function parseNookNetUrl(value: string): Result<TownTuneSettings> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return err(TOWN_TUNE_ERRORS.unsupportedUrl);
  }

  if (!['nooknet.net', 'www.nooknet.net'].includes(url.hostname) || url.pathname !== '/tunes') {
    return err(TOWN_TUNE_ERRORS.unsupportedUrl);
  }

  const melody = url.searchParams.get('melody');
  if (!melody) {
    return err(url.searchParams.has('t') ? TOWN_TUNE_ERRORS.compactMissingMelody : TOWN_TUNE_ERRORS.missingMelody);
  }

  const tokens = melody.split('-');
  if (tokens.length !== 16) {
    return err(TOWN_TUNE_ERRORS.invalidLength);
  }

  let previousFrequency: number | null = null;
  const notes: TownTuneNote[] = [];

  for (const token of tokens) {
    if (token !== 's' && token !== 'z' && token !== 'R' && !(token in FREQUENCIES)) {
      return err(TOWN_TUNE_ERRORS.unsupportedToken);
    }

    const note = mapToken(token, previousFrequency);
    if (note.kind === 'note' || note.kind === 'sustain') {
      previousFrequency = note.frequency;
    }
    notes.push(note);
  }

  return ok({
    url: value,
    title: url.searchParams.get('title'),
    notes,
  });
}
