import { useEffect } from 'react';
import type { AudioRuntimeState } from '../../L2_Core/types';
import { GameHeading } from '../../L4_Atom/ui/GameHeading';
import { ProgressBar } from '../../L4_Atom/ui/ProgressBar';

interface AudioLoadingStepProps {
  audio: AudioRuntimeState;
  onPrepare: () => Promise<void>;
  labels: {
    title: string;
    progress: string;
    waiting: string;
    starting: string;
    ready: string;
  };
}

export function AudioLoadingStep({ audio, onPrepare, labels }: AudioLoadingStepProps) {
  useEffect(() => {
    if (audio.status === 'idle') {
      void onPrepare();
    }
  }, [audio.status, onPrepare]);

  useEffect(() => {
    if (audio.status !== 'error' || audio.loadProgress?.status !== 'failed') {
      return undefined;
    }

    const retry = window.setTimeout(() => {
      void onPrepare();
    }, 1200);

    return () => window.clearTimeout(retry);
  }, [audio.loadProgress?.status, audio.status, onPrepare]);

  const progress = audio.loadProgress ?? { done: 0, total: 2, label: labels.waiting, status: 'checkingCache' as const };
  const progressLabel =
    progress.status === 'ready' ? labels.ready : progress.status === 'checkingCache' && progress.label === 'Starting' ? labels.starting : progress.label;

  return (
    <div className="onboarding-body">
      <GameHeading>{labels.title}</GameHeading>
      <ProgressBar value={progress.done} max={progress.total} label={labels.progress} />
      <p className={progress.status === 'failed' ? 'error-text' : 'muted'}>{progressLabel}</p>
    </div>
  );
}
