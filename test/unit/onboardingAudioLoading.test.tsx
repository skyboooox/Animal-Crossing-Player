import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AudioRuntimeState } from '../../src/L2_Core/types';
import { AudioLoadingStep } from '../../src/L1_Entry/onboarding/AudioLoadingStep';

const failedAudio: AudioRuntimeState = {
  status: 'error',
  townTunePreviewStatus: 'idle',
  currentTrack: null,
  nextTrack: null,
  loadProgress: {
    done: 1,
    total: 2,
    label: 'Network failed',
    status: 'failed',
  },
  cacheProgress: null,
};

const readyAudio: AudioRuntimeState = {
  status: 'ready',
  townTunePreviewStatus: 'idle',
  currentTrack: null,
  nextTrack: null,
  loadProgress: {
    done: 2,
    total: 2,
    label: 'Ready',
    status: 'ready',
  },
  cacheProgress: null,
};

describe('AudioLoadingStep', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries failed audio loading automatically without a retry button', async () => {
    vi.useFakeTimers();
    const onPrepare = vi.fn().mockResolvedValue(undefined);

    render(
      <AudioLoadingStep
        audio={failedAudio}
        onPrepare={onPrepare}
        labels={{ title: 'Audio Loading', progress: 'Audio preload progress', waiting: 'Waiting', starting: 'Starting', ready: 'Ready' }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(onPrepare).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1199);
    });
    expect(onPrepare).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(onPrepare).toHaveBeenCalledTimes(1);
  });

  it('shows only the localized status label for ready audio', () => {
    render(
      <AudioLoadingStep
        audio={readyAudio}
        onPrepare={vi.fn().mockResolvedValue(undefined)}
        labels={{ title: 'Audio Loading', progress: 'Audio preload progress', waiting: 'Waiting', starting: 'Starting', ready: 'Ready' }}
      />,
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.queryByText('Ready · ready')).not.toBeInTheDocument();
  });
});
