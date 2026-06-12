import type { AppSettings, RuntimeState } from './types';
import { createDefaultSettings } from '../L3_Business/settings/defaults';

export function setOnboardingStep(runtime: RuntimeState, step: NonNullable<RuntimeState['onboardingStep']>): RuntimeState {
  return {
    ...runtime,
    onboardingStep: step,
  };
}

export function skipWithDefaults(runtime: RuntimeState, defaults: AppSettings = createDefaultSettings()): { settings: AppSettings; runtime: RuntimeState } {
  return {
    settings: defaults,
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
