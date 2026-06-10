import type { AppState, AppSettings, BgmVersion, IslandWeather, Language, LoadProgress } from '../L2_Core/types';
import { AudioCore } from '../L2_Core/audioCore';
import { createInitialAppState } from '../L2_Core/appState';
import { completeOnboarding, setOnboardingStep, skipWithDefaults } from '../L2_Core/onboardingCore';
import { buildExportConfig, clearSettings, importSettingsFromJson, loadSettings, saveSettings } from '../L2_Core/settingsCore';
import { bootstrapApp } from '../L2_Core/startupCore';
import { refreshWeather as refreshWeatherCore } from '../L2_Core/weatherCore';
import { parseNookNetUrl } from '../L3_Business/townTune/parseNookNetUrl';
import { createDefaultSettings } from '../L3_Business/settings/defaults';
import { loadAudioManifest } from '../L4_Atom/assetManifest/loadAudioManifest';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { clearUploadedBackground as clearUploadedBackgroundCore, storeUploadedBackground } from '../L2_Core/backgroundCore';
import { buildRemoteStateMessage, handleRemoteCommand, validateMqttSettings } from '../L2_Core/remoteControlCore';
import { createBrowserMqttClient } from '../L4_Atom/mqtt/mqttClient';
import { buildMqttTopics, isRemoteCommand, parseMqttJson, stringifyMqttJson } from '../L4_Atom/mqtt/mqttJson';
import { AppContext } from './appContext';

export interface AppActions {
  setLanguage(language: Language): void;
  setBgmVersion(version: BgmVersion): void;
  setOnboardingStep(step: NonNullable<AppState['runtime']['onboardingStep']>): void;
  skipOnboarding(): void;
  parseTownTuneUrl(url: string): string | null;
  clearTownTune(): void;
  prepareAudio(): Promise<void>;
  startAudio(): Promise<void>;
  previewTownTune(): Promise<void>;
  updateSettings(updater: (settings: AppSettings) => AppSettings): void;
  refreshWeather(): Promise<void>;
  setManualWeather(weather: IslandWeather, locationLabel: string): void;
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
  const autoWeatherStartedRef = useRef(false);
  const appSettings = state?.settings;
  const mqttSettings = state?.settings.mqtt;
  const audioStatus = state?.runtime.audio.status;
  const hourlyFlowEnabled = state?.settings.audio.hourlyFlowEnabled;
  const manifest = state?.manifest;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateSettings = useCallback((updater: (settings: AppSettings) => AppSettings) => {
    setState((current) => {
      if (!current) {
        return current;
      }
      const settings = updater(current.settings);
      saveSettings(settings);
      return {
        ...current,
        settings,
        runtime: {
          ...current.runtime,
          weather:
            settings.weather.mode === 'manual'
              ? {
                  value: settings.weather.manualValue,
                  locationLabel: settings.weather.manualLocationLabel,
                  temperature: null,
                  temperatureMax: null,
                  temperatureMin: null,
                  weatherCode: null,
                  updatedAt: new Date().toISOString(),
                  source: 'manual',
                }
              : current.runtime.weather,
        },
      };
    });
  }, []);

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
            void audioCore.current.previewTownTune(nextState.settings.townTune.notes, nextState.settings.audio.townTuneVolume);
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
          if (result.shouldPublishState) {
            client.publish(topics.state, stringifyMqttJson(buildRemoteStateMessage(nextState)), {
              qos: nextState.settings.mqtt.qos,
              retain: nextState.settings.mqtt.retainState,
            });
          }
        });

        setState((current) =>
          current
            ? {
                ...current,
                runtime: {
                  ...current.runtime,
                  mqtt: { status: 'connected', lastError: null, connectedAt: new Date().toISOString() },
                },
              }
            : current,
        );
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
      client.disconnect();
    };
  }, [mqttSettings]);

  useEffect(() => {
    if (
      !appSettings ||
      autoWeatherStartedRef.current ||
      !appSettings.onboardingCompleted ||
      appSettings.weather.mode !== 'auto'
    ) {
      return;
    }

    autoWeatherStartedRef.current = true;
    void refreshWeatherCore(appSettings).then((result) => {
      saveSettings(result.settings);
      setState((current) =>
        current
          ? {
              ...current,
              settings: result.settings,
              runtime: {
                ...current.runtime,
                weather: result.snapshot,
                errors: result.error
                  ? [{ id: `error-${Date.now()}`, scope: 'weather', message: result.error, createdAt: new Date().toISOString() }, ...current.runtime.errors]
                  : current.runtime.errors,
              },
            }
          : current,
      );
    });
  }, [appSettings]);

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
      skipOnboarding() {
        setState((current) => {
          if (!current) {
            return current;
          }
          const next = skipWithDefaults(current.settings, current.runtime);
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
        const current = state;
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
      async startAudio() {
        const current = state;
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
          if (current.manifest && next.settings.audio.preloadNextHour) {
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
        if (state?.settings.townTune.notes.length) {
          await audioCore.current.previewTownTune(state.settings.townTune.notes, state.settings.audio.townTuneVolume);
        }
      },
      updateSettings,
      async refreshWeather() {
        const current = state;
        if (!current) {
          return;
        }
        const result = await refreshWeatherCore(current.settings);
        saveSettings(result.settings);
        setState({
          ...current,
          settings: result.settings,
          runtime: {
            ...current.runtime,
            weather: result.snapshot,
            errors: result.error
              ? [{ id: `error-${Date.now()}`, scope: 'weather', message: result.error, createdAt: new Date().toISOString() }, ...current.runtime.errors]
              : current.runtime.errors,
          },
        });
      },
      setManualWeather(weather, locationLabel) {
        updateSettings((settings) => ({
          ...settings,
          weather: {
            ...settings.weather,
            mode: 'manual',
            manualValue: weather,
            manualLocationLabel: locationLabel || 'Manual',
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
        const current = state;
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
        if (!state) {
          return '';
        }
        return JSON.stringify(buildExportConfig(state.settings), null, 2);
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
    [state, updateSettings],
  );

  return <AppContext.Provider value={{ state, loading, actions }}>{children}</AppContext.Provider>;
}
