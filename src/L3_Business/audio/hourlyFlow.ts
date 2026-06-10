import type { AudioTrackRef, TownTuneNote } from '../../L4_Atom/types';

export type HourlyFlowStep =
  | { kind: 'fadeOut'; ms: number }
  | { kind: 'townTune'; notes: TownTuneNote[] }
  | { kind: 'bell'; url: string }
  | { kind: 'switchTrack'; track: AudioTrackRef }
  | { kind: 'fadeIn'; ms: number }
  | { kind: 'preloadNext'; track: AudioTrackRef };

export function planHourlyFlow(options: {
  fadeMs: number;
  townTuneNotes: TownTuneNote[];
  bellUrl: string;
  nextTrack: AudioTrackRef;
  followingTrack: AudioTrackRef;
}): HourlyFlowStep[] {
  const steps: HourlyFlowStep[] = [{ kind: 'fadeOut', ms: options.fadeMs }];

  if (options.townTuneNotes.length > 0) {
    steps.push({ kind: 'townTune', notes: options.townTuneNotes });
  }

  steps.push(
    { kind: 'bell', url: options.bellUrl },
    { kind: 'switchTrack', track: options.nextTrack },
    { kind: 'fadeIn', ms: options.fadeMs },
    { kind: 'preloadNext', track: options.followingTrack },
  );

  return steps;
}
