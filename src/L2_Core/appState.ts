import type { AppError, AppSettings, AppState, AudioManifest, RemoteLogEntry, RuntimeState, WeatherSnapshot } from './types';
import { createFallbackWeatherSnapshot, getEffectiveWeather } from '../L3_Business/settings/defaults';
import { createId } from '../L4_Atom/utils/ids';

export function createInitialRuntime(settings: AppSettings, now = new Date()): RuntimeState {
  const weather = getEffectiveWeather(settings, now);

  return {
    appReady: true,
    onboardingStep: settings.onboardingCompleted ? null : 'language',
    startupAudioPromptOpen: settings.onboardingCompleted,
    audio: {
      status: 'idle',
      townTunePreviewStatus: 'idle',
      currentTrack: null,
      nextTrack: null,
      loadProgress: null,
      cacheProgress: null,
    },
    weather,
    mqtt: {
      status: settings.mqtt.enabled ? 'connecting' : 'off',
      lastError: null,
      connectedAt: null,
    },
    errors: [],
  };
}

export function createInitialAppState(settings: AppSettings, manifest: AudioManifest | null, now = new Date()): AppState {
  return {
    settings,
    manifest,
    runtime: createInitialRuntime(settings, now),
    remoteLog: [],
  };
}

export function withSettings(state: AppState, settings: AppSettings, now = new Date()): AppState {
  const weather = getEffectiveWeather(settings, now);
  return {
    ...state,
    settings,
    runtime: {
      ...state.runtime,
      weather,
    },
  };
}

export function withWeather(state: AppState, weather: WeatherSnapshot): AppState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      weather,
    },
  };
}

export function addAppError(state: AppState, scope: AppError['scope'], message: string, now = new Date()): AppState {
  return {
    ...state,
    runtime: {
      ...state.runtime,
      errors: [
        {
          id: createId('error'),
          scope,
          message,
          createdAt: now.toISOString(),
        },
        ...state.runtime.errors,
      ].slice(0, 20),
    },
  };
}

export function appendRemoteLog(state: AppState, entry: Omit<RemoteLogEntry, 'id' | 'createdAt'>, now = new Date()): AppState {
  return {
    ...state,
    remoteLog: [
      {
        id: createId('log'),
        createdAt: now.toISOString(),
        ...entry,
      },
      ...state.remoteLog,
    ].slice(0, 50),
  };
}

export function fallbackRuntime(now = new Date()): RuntimeState {
  return {
    appReady: false,
    onboardingStep: null,
    startupAudioPromptOpen: false,
    audio: {
      status: 'idle',
      townTunePreviewStatus: 'idle',
      currentTrack: null,
      nextTrack: null,
      loadProgress: null,
      cacheProgress: null,
    },
    weather: createFallbackWeatherSnapshot(now),
    mqtt: {
      status: 'off',
      lastError: null,
      connectedAt: null,
    },
    errors: [],
  };
}
