import type { TownTuneNote } from '../../L4_Atom/types';

export interface TownTuneStep {
  frequency: number | null;
  durationMs: number;
}

export function buildTownTuneSequence(notes: TownTuneNote[], stepMs = 220): TownTuneStep[] {
  return notes.map((note) => ({
    frequency: note.frequency,
    durationMs: note.kind === 'sustain' ? stepMs * 1.1 : stepMs,
  }));
}
