import type { AppState, AppSettings, BgmVersion, Language, LoadProgress } from '../L2_Core/types';
import { AudioCore } from '../L2_Core/audioCore';
import { createInitialAppState } from '../L2_Core/appState';
import { completeOnboarding, setOnboardingStep, skipWithDefaults } from '../L2_Core/onboardingCore';
import { buildExportConfig, clearSettings, importSettingsFromJson, loadSettings, saveSettings } from '../L2_Core/settingsCore';
import { bootstrapApp } from '../L2_Core/startupCore';
import { refreshWeather as refreshWeatherCore } from '../L2_Core/weatherCore';
import { parseNookNetUrl } from '../L3_Business/townTune/parseNookNetUrl';
import { createDefaultSettings, createFallbackWeatherSnapshot } from '../L3_Business/settings/defaults';
import { loadAudioManifest } from '../L4_Atom/assetManifest/loadAudioManifest';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { clearUploadedBackground as clearUploadedBackgroundCore, storeUploadedBackground } from '../L2_Core/backgroundCore';
import { buildRemoteStateMessage, handleRemoteCommand, validateMqttSettings } from '../L2_Core/remoteControlCore';
import { createBrowserMqttClient } from '../L4_Atom/mqtt/mqttClient';
import type { BrowserMqttClient } from '../L4_Atom/mqtt/mqttClient';
import { buildHomeAssistantDiscoveryMessages, buildMqttTopics, isRemoteCommand, parseMqttJson, stringifyMqttJson } from '../L4_Atom/mqtt/mqttJson';
import { AppActionsContext, AppStateContext } from './appContext';

const WEATHER_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

function publishHomeAssistantDiscovery(client: BrowserMqttClient, mqtt: AppSettings['mqtt']) {
  const topics = buildMqttTopics(mqtt.baseTopic, mqtt.clientId);
  client.publish(topics.availability, 'online', { qos: mqtt.qos, retain: true });
  for (const message of buildHomeAssistantDiscoveryMessages(mqtt)) {
    client.publish(message.topic, message.payload, { qos: mqtt.qos, retain: true });
  }
}

function publishMqttState(client: BrowserMqttClient, state: AppState) {
  const topics = buildMqttTopics(state.settings.mqtt.baseTopic, state.settings.mqtt.clientId);
  client.publish(topics.state, stringifyMqttJson(buildRemoteStateMessage(state)), {
    qos: state.settings.mqtt.qos,
    retain: state.settings.mqtt.retainState,
  });
}

export interface AppActions {
  setLanguage(language: Language): void;
  setBgmVersion(version: BgmVersion): void;
  setOnboardingStep(step: NonNullable<AppState['runtime']['onboardingStep']>): void;
  enterOnboarding(): void;
  skipOnboarding(): void;
  parseTownTuneUrl(url: string): string | null;
  clearTownTune(): void;
  prepareAudio(): Promise<void>;
  reloadAudio(): Promise<void>;
  startAudio(): Promise<void>;
  previewTownTune(): Promise<void>;
  stopTownTunePreview(): void;
  triggerHourlyChime(): Promise<void>;
  updateSettings(updater: (settings: AppSettings) => AppSettings): void;
  refreshWeather(): Promise<void>;
  setManualWeatherLocation(locationLabel: string): void;
  uploadBackground(file: File): Promise<void>;
  clearUploadedBackground(): Promise<void>;
  clearAudioCache(): Promise<void>;
  exportSettings(): string;
  importSettings(value: string): string[];
  resetSettings(): void;
  dismissAudioBlock(): void;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const audioCore = useRef(new AudioCore());
  const stateRef = useRef<AppState | null>(null);
  const lastHourRef = useRef(new Date().getHours());
  const townTunePreviewRequestRef = useRef(0);
  const appSettings = state?.settings;
  const mqttSettings = state?.settings.mqtt;
  const audioStatus = state?.runtime.audio.status;
  const hourlyFlowEnabled = state?.settings.audio.hourlyFlowEnabled;
  const manifest = state?.manifest;
  const bgmVolume = appSettings?.audio.bgmVolume;
  const townTuneVolume = appSettings?.audio.townTuneVolume;
  const onboardingCompleted = appSettings?.onboardingCompleted;
  const weatherMode = appSettings?.weather.mode;
  const manualLocation = appSettings?.weather.manualLocationLabel;
  const language = appSettings?.language;

  stateRef.current = state;

  const getCurrentState = useCallback(() => stateRef.current, []);

  useEffect(() => {
    if (bgmVolume === undefined || townTuneVolume === undefined) {
      return;
    }

    audioCore.current.setBgmVolume(bgmVolume);
    audioCore.current.setTownTuneVolume(townTuneVolume);
  }, [bgmVolume, townTuneVolume]);

  const updateSettings = useCallback((updater: (settings: AppSettings) => AppSettings) => {
    setState((current) => {
      if (!current) {
        return current;
      }
      const settings = updater(current.settings);
      const weatherSettingsChanged =
        settings.weather.mode !== current.settings.weather.mode ||
        settings.weather.manualLocationLabel !== current.settings.weather.manualLocationLabel;
      const shouldResetManualWeather = settings.weather.mode === 'manual' && weatherSettingsChanged;
      const manualFallback = shouldResetManualWeather
        ? { ...createFallbackWeatherSnapshot(), locationLabel: settings.weather.manualLocationLabel || 'Manual' }
        : null;
      saveSettings(settings);
      return {
        ...current,
        settings,
        runtime: {
          ...current.runtime,
          weather: manualFallback ?? current.runtime.weather,
        },
      };
    });
  }, []);

  const refreshWeatherState = useCallback(async (settingsOverride?: AppSettings) => {
    const current = getCurrentState();
    const settings = settingsOverride ?? current?.settings;
    if (!settings) {
      return null;
    }

    const result = await refreshWeatherCore(settings);
    saveSettings(result.settings);
    setState((existing) =>
      existing
        ? {
            ...existing,
            settings: result.settings,
            runtime: {
              ...existing.runtime,
              weather: result.snapshot,
              errors: result.error
                ? [{ id: `error-${Date.now()}`, scope: 'weather', message: result.error, createdAt: new Date().toISOString() }, ...existing.runtime.errors]
                : existing.runtime.errors,
            },
          }
        : existing,
    );
    return result;
  }, [getCurrentState]);

  const setTownTunePreviewStatus = useCallback((status: AppState['runtime']['audio']['townTunePreviewStatus']) => {
    setState((current) =>
      current
        ? {
            ...current,
            runtime: {
              ...current.runtime,
              audio: {
                ...current.runtime.audio,
                townTunePreviewStatus: status,
              },
            },
          }
        : current,
    );
  }, []);

  const stopTownTunePreview = useCallback(() => {
    townTunePreviewRequestRef.current += 1;
    audioCore.current.stopTownTunePreview();
    setTownTunePreviewStatus('idle');
  }, [setTownTunePreviewStatus]);

  const runTownTunePreview = useCallback(
    async (notes: AppSettings['townTune']['notes'], volume: number) => {
      if (notes.length === 0) {
        return;
      }

      const requestId = townTunePreviewRequestRef.current + 1;
      townTunePreviewRequestRef.current = requestId;
      setTownTunePreviewStatus('playing');

      try {
        await audioCore.current.previewTownTune(notes, volume);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Town tune preview failed.';
        setState((current) =>
          current
            ? {
                ...current,
                runtime: {
                  ...current.runtime,
                  audio: { ...current.runtime.audio, townTunePreviewStatus: 'idle' },
                  errors: [{ id: `error-${Date.now()}`, scope: 'audio', message, createdAt: new Date().toISOString() }, ...current.runtime.errors],
                },
              }
            : current,
        );
      } finally {
        if (townTunePreviewRequestRef.current === requestId) {
          setTownTunePreviewStatus('idle');
        }
      }
    },
    [setTownTunePreviewStatus],
  );

  useEffect(() => {
    let mounted = true;

    bootstrapApp()
      .then((bootstrapped) => {
        if (mounted) {
          setState(bootstrapped);
        }
      })
      .catch(async () => {
        const settings = loadSettings();
        const manifest = await loadAudioManifest().catch(() => null);
        if (mounted) {
          setState(createInitialAppState(settings, manifest));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!mqttSettings?.enabled) {
      return undefined;
    }

    const validation = validateMqttSettings({ mqtt: mqttSettings });
    if (validation) {
      setState((current) =>
        current
          ? {
              ...current,
              runtime: {
                ...current.runtime,
                mqtt: { status: 'error', lastError: validation, connectedAt: null },
              },
            }
          : current,
      );
      return undefined;
    }

    const client = createBrowserMqttClient(mqttSettings);
    const topics = buildMqttTopics(mqttSettings.baseTopic, mqttSettings.clientId);
    let disposed = false;

    setState((current) =>
      current
        ? {
            ...current,
            runtime: {
              ...current.runtime,
              mqtt: { status: 'connecting', lastError: null, connectedAt: null },
            },
          }
        : current,
    );

    void client
      .connect()
      .then(async () => {
        if (disposed) {
          return;
        }

        await client.subscribe(topics.command, (payload) => {
          const current = stateRef.current;
          if (!current) {
            return;
          }

          const parsed = parseMqttJson(payload);
          if (!isRemoteCommand(parsed)) {
            return;
          }

          const result = handleRemoteCommand(current, parsed);
          const logEntries: AppState['remoteLog'] = [
            {
              id: `log-${Date.now()}`,
              direction: 'in',
              kind: 'command',
              summary: parsed.type,
              createdAt: new Date().toISOString(),
            },
            {
              id: `log-${Date.now()}-ack`,
              direction: 'out',
              kind: 'ack',
              summary: result.ack.status,
              createdAt: new Date().toISOString(),
            },
          ];
          const nextState: AppState = {
            ...result.state,
            runtime: {
              ...result.state.runtime,
              mqtt: { status: 'connected', lastError: null, connectedAt: result.state.runtime.mqtt.connectedAt },
            },
            remoteLog: [...logEntries, ...result.state.remoteLog].slice(0, 50),
          };

          stateRef.current = nextState;
          setState(nextState);
          saveSettings(nextState.settings);

          if (parsed.type === 'setVolume' && parsed.target === 'bgm' && typeof parsed.value === 'number') {
            audioCore.current.setBgmVolume(parsed.value);
          }
          if (result.effect === 'previewTownTune') {
            void runTownTunePreview(nextState.settings.townTune.notes, nextState.settings.audio.townTuneVolume);
          }
          if (result.effect === 'triggerHourlyFlow' && nextState.manifest) {
            const hour = new Date().getHours();
            void audioCore.current
              .runHourlyFlow(nextState.manifest, nextState.settings, nextState.runtime.weather.value, hour)
              .then((tracks) => {
                setState((existing) =>
                  existing
                    ? {
                        ...existing,
                        runtime: {
                          ...existing.runtime,
                          audio: {
                            ...existing.runtime.audio,
                            status: 'playing',
                            currentTrack: tracks.currentTrack,
                            nextTrack: tracks.nextTrack,
                          },
                        },
                      }
                  : existing,
                );
              });
          }

          client.publish(topics.ack, stringifyMqttJson(result.ack), { qos: nextState.settings.mqtt.qos, retain: false });
          if (result.effect === 'refreshWeather') {
            void refreshWeatherCore(nextState.settings).then((weatherResult) => {
              const current = stateRef.current;
              if (!current) {
                return;
              }
              const refreshedState: AppState = {
                ...current,
                settings: weatherResult.settings,
                runtime: {
                  ...current.runtime,
                  weather: weatherResult.snapshot,
                  errors: weatherResult.error
                    ? [{ id: `error-${Date.now()}`, scope: 'weather', message: weatherResult.error, createdAt: new Date().toISOString() }, ...current.runtime.errors]
                    : current.runtime.errors,
                },
              };
              stateRef.current = refreshedState;
              setState(refreshedState);
              saveSettings(refreshedState.settings);
              if (result.shouldPublishState) {
                publishMqttState(client, refreshedState);
              }
            });
          } else if (result.shouldPublishState) {
            publishMqttState(client, nextState);
          }
        });

        await client.subscribe(topics.homeAssistantStatus, (payload) => {
          const status = new TextDecoder().decode(payload).trim();
          const current = stateRef.current;
          if (status === 'online' && current?.settings.mqtt.enabled) {
            publishHomeAssistantDiscovery(client, current.settings.mqtt);
            publishMqttState(client, current);
          }
        });

        const current = stateRef.current;
        if (!current) {
          return;
        }
        const connectedState: AppState = {
          ...current,
          runtime: {
            ...current.runtime,
            mqtt: { status: 'connected', lastError: null, connectedAt: new Date().toISOString() },
          },
        };
        stateRef.current = connectedState;
        setState(connectedState);
        publishHomeAssistantDiscovery(client, connectedState.settings.mqtt);
        publishMqttState(client, connectedState);
      })
      .catch((error) => {
        if (disposed) {
          return;
        }
        const message = error instanceof Error ? error.message : 'MQTT connection failed.';
        setState((current) =>
          current
            ? {
                ...current,
                runtime: {
                  ...current.runtime,
                  mqtt: { status: 'error', lastError: message, connectedAt: null },
                },
              }
            : current,
        );
      });

    return () => {
      disposed = true;
      client.publish(topics.availability, 'offline', { qos: mqttSettings.qos, retain: true });
      client.disconnect();
    };
  }, [mqttSettings, runTownTunePreview]);

  useEffect(() => {
    const canRefreshWeather = () => {
      const settings = stateRef.current?.settings;
      return Boolean(
        settings?.onboardingCompleted &&
          (settings.weather.mode === 'auto' || settings.weather.manualLocationLabel.trim().length > 0),
      );
    };

    if (!canRefreshWeather()) {
      return undefined;
    }

    void refreshWeatherState();
    const timer = window.setInterval(() => {
      if (canRefreshWeather()) {
        void refreshWeatherState();
      }
    }, WEATHER_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [language, manualLocation, onboardingCompleted, refreshWeatherState, weatherMode]);

  useEffect(() => {
    if (audioStatus !== 'playing' || !manifest || !hourlyFlowEnabled) {
      return undefined;
    }

    const timer = setInterval(() => {
      const hour = new Date().getHours();
      const current = stateRef.current;
      if (hour === lastHourRef.current || !current?.manifest) {
        return;
      }
      lastHourRef.current = hour;
      void audioCore.current
        .runHourlyFlow(current.manifest, current.settings, current.runtime.weather.value, hour)
        .then((tracks) => {
          setState((existing) =>
            existing
              ? {
                  ...existing,
                  runtime: {
                    ...existing.runtime,
                    audio: {
                      ...existing.runtime.audio,
                      status: 'playing',
                      currentTrack: tracks.currentTrack,
                      nextTrack: tracks.nextTrack,
                    },
                  },
                }
              : existing,
          );
        });
    }, 15_000);

    return () => clearInterval(timer);
  }, [audioStatus, hourlyFlowEnabled, manifest]);

  const actions = useMemo<AppActions>(
    () => ({
      setLanguage(language) {
        updateSettings((settings) => ({ ...settings, language }));
      },
      setBgmVersion(version) {
        updateSettings((settings) => ({ ...settings, bgmVersion: version }));
      },
      setOnboardingStep(step) {
        setState((current) => (current ? { ...current, runtime: setOnboardingStep(current.runtime, step) } : current));
      },
      enterOnboarding() {
        setState((current) => {
          if (!current) {
            return current;
          }
          const settings = { ...current.settings, onboardingCompleted: false };
          saveSettings(settings);
          return {
            ...current,
            settings,
            runtime: {
              ...current.runtime,
              onboardingStep: 'language',
              startupAudioPromptOpen: false,
            },
          };
        });
      },
      skipOnboarding() {
        setState((current) => {
          if (!current) {
            return current;
          }
          const next = skipWithDefaults(current.runtime);
          saveSettings(next.settings);
          return { ...current, settings: next.settings, runtime: next.runtime };
        });
      },
      parseTownTuneUrl(url) {
        const parsed = parseNookNetUrl(url);
        if (!parsed.ok) {
          return parsed.error;
        }
        updateSettings((settings) => ({ ...settings, townTune: parsed.value }));
        return null;
      },
      clearTownTune() {
        updateSettings((settings) => ({ ...settings, townTune: { url: null, title: null, notes: [] } }));
      },
      async prepareAudio() {
        const current = getCurrentState();
        if (!current?.manifest) {
          setState((existing) =>
            existing
              ? {
                  ...existing,
                  runtime: {
                    ...existing.runtime,
                    audio: { ...existing.runtime.audio, status: 'error' },
                    errors: [
                      {
                        id: `error-${Date.now()}`,
                        scope: 'audio',
                        message: 'Audio manifest is not available.',
                        createdAt: new Date().toISOString(),
                      },
                      ...existing.runtime.errors,
                    ],
                  },
                }
              : existing,
          );
          return;
        }

        const hour = new Date().getHours();
        setState((existing) =>
          existing
            ? {
                ...existing,
                runtime: {
                  ...existing.runtime,
                  audio: { ...existing.runtime.audio, status: 'loading', loadProgress: { done: 0, total: 2, label: 'Starting', status: 'checkingCache' } },
                },
              }
            : existing,
        );

        try {
          const prepared = await audioCore.current.prepareInitialAudio(current.manifest, current.settings, current.runtime.weather.value, hour, (progress: LoadProgress) => {
            setState((existing) =>
              existing
                ? {
                    ...existing,
                    runtime: {
                      ...existing.runtime,
                      audio: { ...existing.runtime.audio, status: 'loading', loadProgress: progress },
                    },
                  }
                : existing,
            );
          });

          setState((existing) =>
            existing
              ? {
                  ...existing,
                  runtime: {
                    ...existing.runtime,
                    audio: {
                      ...existing.runtime.audio,
                      status: 'ready',
                      currentTrack: prepared.track,
                      nextTrack: prepared.nextTrack,
                      loadProgress: { done: 2, total: 2, label: 'Ready', status: 'ready' },
                    },
                  },
                }
              : existing,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Audio loading failed.';
          setState((existing) =>
            existing
              ? {
                  ...existing,
                  runtime: {
                    ...existing.runtime,
                    audio: { ...existing.runtime.audio, status: 'error', loadProgress: { done: 0, total: 2, label: message, status: 'failed' } },
                    errors: [{ id: `error-${Date.now()}`, scope: 'audio', message, createdAt: new Date().toISOString() }, ...existing.runtime.errors],
                  },
                }
              : existing,
          );
        }
      },
      async reloadAudio() {
        const current = getCurrentState();
        if (!current?.manifest) {
          setState((existing) =>
            existing
              ? {
                  ...existing,
                  runtime: {
                    ...existing.runtime,
                    audio: { ...existing.runtime.audio, status: 'error' },
                    errors: [
                      {
                        id: `error-${Date.now()}`,
                        scope: 'audio',
                        message: 'Audio manifest is not available.',
                        createdAt: new Date().toISOString(),
                      },
                      ...existing.runtime.errors,
                    ],
                  },
                }
              : existing,
          );
          return;
        }

        const hour = new Date().getHours();
        const shouldRestart = current.runtime.audio.status === 'playing';
        setState((existing) =>
          existing
            ? {
                ...existing,
                runtime: {
                  ...existing.runtime,
                  audio: { ...existing.runtime.audio, status: 'loading', loadProgress: { done: 0, total: 2, label: 'Starting', status: 'checkingCache' } },
                },
              }
            : existing,
        );

        try {
          const prepared = await audioCore.current.prepareInitialAudio(current.manifest, current.settings, current.runtime.weather.value, hour, (progress: LoadProgress) => {
            setState((existing) =>
              existing
                ? {
                    ...existing,
                    runtime: {
                      ...existing.runtime,
                      audio: { ...existing.runtime.audio, status: 'loading', loadProgress: progress },
                    },
                  }
                : existing,
            );
          });
          const track = shouldRestart ? await audioCore.current.startPrepared(current.settings) : prepared.track;

          setState((existing) =>
            existing
              ? {
                  ...existing,
                  runtime: {
                    ...existing.runtime,
                    audio: {
                      ...existing.runtime.audio,
                      status: shouldRestart ? 'playing' : 'ready',
                      currentTrack: track,
                      nextTrack: prepared.nextTrack,
                      loadProgress: { done: 2, total: 2, label: 'Ready', status: 'ready' },
                    },
                  },
                }
              : existing,
          );
          if (shouldRestart) {
            void audioCore.current.preloadNextHour(current.manifest, current.settings, current.runtime.weather.value, new Date().getHours());
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Audio loading failed.';
          setState((existing) =>
            existing
              ? {
                  ...existing,
                  runtime: {
                    ...existing.runtime,
                    audio: { ...existing.runtime.audio, status: 'error', loadProgress: { done: 0, total: 2, label: message, status: 'failed' } },
                    errors: [{ id: `error-${Date.now()}`, scope: 'audio', message, createdAt: new Date().toISOString() }, ...existing.runtime.errors],
                  },
                }
              : existing,
          );
        }
      },
      async startAudio() {
        const current = getCurrentState();
        if (!current) {
          return;
        }

        try {
          const track = await audioCore.current.startPrepared(current.settings);
          const next = completeOnboarding(current.settings, current.runtime);
          saveSettings(next.settings);
          setState({
            ...current,
            settings: next.settings,
            runtime: {
              ...next.runtime,
              startupAudioPromptOpen: false,
              audio: {
                ...next.runtime.audio,
                status: 'playing',
                currentTrack: track,
              },
            },
          });
          if (current.manifest) {
            void audioCore.current.preloadNextHour(current.manifest, next.settings, current.runtime.weather.value, new Date().getHours());
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Browser blocked audio playback.';
          setState((existing) =>
            existing
              ? {
                  ...existing,
                  runtime: {
                    ...existing.runtime,
                    audio: { ...existing.runtime.audio, status: 'blocked' },
                    errors: [{ id: `error-${Date.now()}`, scope: 'audio', message, createdAt: new Date().toISOString() }, ...existing.runtime.errors],
                  },
                }
              : existing,
          );
        }
      },
      async previewTownTune() {
        const current = getCurrentState();
        if (!current?.settings.townTune.notes.length) {
          return;
        }

        if (current.runtime.audio.townTunePreviewStatus === 'playing') {
          stopTownTunePreview();
          return;
        }
        await runTownTunePreview(current.settings.townTune.notes, current.settings.audio.townTuneVolume);
      },
      stopTownTunePreview,
      async triggerHourlyChime() {
        const current = getCurrentState();
        if (!current) {
          return;
        }

        try {
          await audioCore.current.triggerHourlyChime(current.settings, new Date().getHours());
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Hourly chime failed.';
          setState((existing) =>
            existing
              ? {
                  ...existing,
                  runtime: {
                    ...existing.runtime,
                    errors: [{ id: `error-${Date.now()}`, scope: 'audio', message, createdAt: new Date().toISOString() }, ...existing.runtime.errors],
                  },
                }
              : existing,
          );
        }
      },
      updateSettings,
      async refreshWeather() {
        await refreshWeatherState();
      },
      setManualWeatherLocation(locationLabel) {
        updateSettings((settings) => ({
          ...settings,
          weather: {
            ...settings.weather,
            mode: 'manual',
            manualLocationLabel: locationLabel,
            lastAuto: settings.weather.manualLocationLabel === locationLabel ? settings.weather.lastAuto : null,
          },
        }));
      },
      async uploadBackground(file) {
        const uploaded = await storeUploadedBackground(file);
        updateSettings((settings) => ({
          ...settings,
          background: {
            ...settings.background,
            kind: 'uploaded',
            uploadedImageId: uploaded.id,
          },
        }));
      },
      async clearUploadedBackground() {
        const current = getCurrentState();
        if (!current) {
          return;
        }
        const settings = await clearUploadedBackgroundCore(current.settings);
        saveSettings(settings);
        setState({ ...current, settings });
      },
      async clearAudioCache() {
        await audioCore.current.clearAudioCache();
      },
      exportSettings() {
        const current = getCurrentState();
        if (!current) {
          return '';
        }
        return JSON.stringify(buildExportConfig(current.settings), null, 2);
      },
      importSettings(value) {
        const imported = importSettingsFromJson(value, createDefaultSettings());
        const settings = imported.settings;
        saveSettings(settings);
        setState((current) => (current ? { ...current, settings } : current));
        return imported.warnings;
      },
      resetSettings() {
        clearSettings();
        const settings = createDefaultSettings();
        saveSettings(settings);
        setState((current) => (current ? createInitialAppState(settings, current.manifest) : current));
      },
      dismissAudioBlock() {
        setState((current) =>
          current
            ? {
                ...current,
                runtime: {
                  ...current.runtime,
                  startupAudioPromptOpen: false,
                  audio: { ...current.runtime.audio, status: 'ready' },
                },
              }
            : current,
        );
      },
    }),
    [runTownTunePreview, getCurrentState, refreshWeatherState, stopTownTunePreview, updateSettings],
  );

  const appStateContextValue = useMemo(() => ({ state, loading }), [state, loading]);

  return (
    <AppStateContext.Provider value={appStateContextValue}>
      <AppActionsContext.Provider value={actions}>{children}</AppActionsContext.Provider>
    </AppStateContext.Provider>
  );
}
