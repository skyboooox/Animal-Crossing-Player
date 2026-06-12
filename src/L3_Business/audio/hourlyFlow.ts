import type { AudioTrackRef, TownTuneNote } from '../../L4_Atom/types';
import { BELL_PLAYLIST_ITEM_GAP_SECONDS, getBellStrikeCount, HOURLY_BGM_FADE_OUT_MS } from '../../L4_Atom/audio/townTuneBell';

export type HourlyFlowStep =
  | { kind: 'fadeOut'; ms: number }
  | { kind: 'bellPlaylist'; url: string; notes: TownTuneNote[]; strikes: number; itemGapSeconds: number }
  | { kind: 'switchTrack'; track: AudioTrackRef }
  | { kind: 'preloadNext'; track: AudioTrackRef };

export function planHourlyFlow(options: {
  hour: number;
  townTuneNotes: TownTuneNote[];
  bellUrl: string;
  nextTrack: AudioTrackRef;
  followingTrack: AudioTrackRef;
}): HourlyFlowStep[] {
  const steps: HourlyFlowStep[] = [{ kind: 'fadeOut', ms: HOURLY_BGM_FADE_OUT_MS }];

  steps.push(
    {
      kind: 'bellPlaylist',
      url: options.bellUrl,
      notes: options.townTuneNotes,
      strikes: getBellStrikeCount(options.hour),
      itemGapSeconds: BELL_PLAYLIST_ITEM_GAP_SECONDS,
    },
    { kind: 'switchTrack', track: options.nextTrack },
    { kind: 'preloadNext', track: options.followingTrack },
  );

  return steps;
}
