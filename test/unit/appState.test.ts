import { describe, expect, it } from 'vitest';
import { createInitialRuntime } from '../../src/L2_Core/appState';
import { createDefaultSettings } from '../../src/L3_Business/settings/defaults';

describe('app state startup runtime', () => {
  it('opens the startup audio prompt for completed onboarding only', () => {
    const defaults = createDefaultSettings();

    expect(createInitialRuntime(defaults).startupAudioPromptOpen).toBe(false);
    expect(createInitialRuntime({ ...defaults, onboardingCompleted: true }).startupAudioPromptOpen).toBe(true);
  });
});
