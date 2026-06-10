import type { AppSettings, RuntimeState } from './types';

export function setOnboardingStep(runtime: RuntimeState, step: NonNullable<RuntimeState['onboardingStep']>): RuntimeState {
  return {
    ...runtime,
    onboardingStep: step,
  };
}

export function skipWithDefaults(settings: AppSettings, runtime: RuntimeState): { settings: AppSettings; runtime: RuntimeState } {
  return {
    settings: {
      ...settings,
      language: 'en',
      bgmVersion: 'New Horizons (Switch 2021)',
      townTune: { url: null, title: null, notes: [] },
    },
    runtime: {
      ...runtime,
      onboardingStep: 'audioLoading',
    },
  };
}

export function completeOnboarding(settings: AppSettings, runtime: RuntimeState): { settings: AppSettings; runtime: RuntimeState } {
  return {
    settings: {
      ...settings,
      onboardingCompleted: true,
    },
    runtime: {
      ...runtime,
      onboardingStep: null,
      startupAudioPromptOpen: false,
    },
  };
}
