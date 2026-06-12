import type {
  AppState,
  AppSettings,
  BgmVersion,
  RemoteAck,
  RemoteCommand,
  RemoteCommandType,
  RemoteStateMessage,
} from './types';
import { BGM_VERSIONS } from './types';
import { parseNookNetUrl } from '../L3_Business/townTune/parseNookNetUrl';
import { isWebSocketUrl } from '../L4_Atom/utils/url';

export interface RemoteCommandResult {
  state: AppState;
  ack: RemoteAck;
  shouldPublishState: boolean;
  effect:
    | 'start'
    | 'pause'
    | 'resume'
    | 'previewTownTune'
    | 'triggerHourlyFlow'
    | 'refreshWeather'
    | 'none';
}

const COMMAND_TYPES = new Set<RemoteCommandType>([
  'start',
  'pause',
  'resume',
  'setVolume',
  'setBgmVersion',
  'setWeather',
  'refreshWeather',
  'setTownTune',
  'previewTownTune',
  'triggerHourlyFlow',
  'requestState',
]);

function buildAck(command: RemoteCommand, status: RemoteAck['status'], message: string, now = new Date()): RemoteAck {
  return {
    version: 1,
    id: `ack-${command.id}`,
    commandId: command.id,
    type: 'ack',
    status,
    message,
    sentAt: now.toISOString(),
  };
}

function applySettings(state: AppState, settings: AppSettings): AppState {
  return {
    ...state,
    settings,
  };
}

function reject(state: AppState, command: RemoteCommand, message: string): RemoteCommandResult {
  return { state, ack: buildAck(command, 'rejected', message), shouldPublishState: false, effect: 'none' };
}

export function handleRemoteCommand(state: AppState, command: RemoteCommand): RemoteCommandResult {
  if (!COMMAND_TYPES.has(command.type)) {
    return reject(state, command, `Unsupported command: ${command.type}`);
  }

  switch (command.type) {
    case 'start':
      return { state, ack: buildAck(command, 'accepted', 'Start requested.'), shouldPublishState: true, effect: 'start' };
    case 'pause':
      return {
        state: {
          ...state,
          runtime: { ...state.runtime, audio: { ...state.runtime.audio, status: 'paused' } },
        },
        ack: buildAck(command, 'applied', 'Playback paused.'),
        shouldPublishState: true,
        effect: 'pause',
      };
    case 'resume':
      return { state, ack: buildAck(command, 'accepted', 'Resume requested.'), shouldPublishState: true, effect: 'resume' };
    case 'setVolume': {
      if ((command.target !== 'bgm' && command.target !== 'townTune') || typeof command.value !== 'number') {
        return reject(state, command, 'Volume target or value is invalid.');
      }
      const value = Math.min(1, Math.max(0, command.value));
      const settings = {
        ...state.settings,
        audio: {
          ...state.settings.audio,
          bgmVolume: command.target === 'bgm' ? value : state.settings.audio.bgmVolume,
          townTuneVolume: command.target === 'townTune' ? value : state.settings.audio.townTuneVolume,
        },
      };
      return {
        state: applySettings(state, settings),
        ack: buildAck(command, 'applied', command.target === 'bgm' ? 'BGM volume updated.' : 'Town tune volume updated.'),
        shouldPublishState: true,
        effect: 'none',
      };
    }
    case 'setBgmVersion': {
      if (typeof command.value !== 'string' || !BGM_VERSIONS.includes(command.value as BgmVersion)) {
        return reject(state, command, 'BGM version is invalid.');
      }
      return {
        state: applySettings(state, { ...state.settings, bgmVersion: command.value as BgmVersion }),
        ack: buildAck(command, 'applied', 'BGM version updated.'),
        shouldPublishState: true,
        effect: 'none',
      };
    }
    case 'setWeather': {
      if (command.mode === 'auto') {
        return {
          state: applySettings(state, { ...state.settings, weather: { ...state.settings.weather, mode: 'auto' } }),
          ack: buildAck(command, 'accepted', 'Automatic weather enabled.'),
          shouldPublishState: true,
          effect: 'refreshWeather',
        };
      }
      if (command.mode !== 'manual' || typeof command.locationLabel !== 'string' || command.locationLabel.trim().length === 0) {
        return reject(state, command, 'Weather mode or location is invalid.');
      }
      const locationLabel = command.locationLabel.trim();
      return {
        state: applySettings(state, {
          ...state.settings,
          weather: {
            ...state.settings.weather,
            mode: 'manual',
            manualLocationLabel: locationLabel,
            lastAuto: state.settings.weather.manualLocationLabel === locationLabel ? state.settings.weather.lastAuto : null,
          },
        }),
        ack: buildAck(command, 'accepted', 'Manual location updated.'),
        shouldPublishState: true,
        effect: 'refreshWeather',
      };
    }
    case 'refreshWeather':
      return { state, ack: buildAck(command, 'accepted', 'Weather refresh requested.'), shouldPublishState: true, effect: 'refreshWeather' };
    case 'setTownTune': {
      if (typeof command.url !== 'string') {
        return reject(state, command, 'Town tune URL is required.');
      }
      const parsed = parseNookNetUrl(command.url);
      if (!parsed.ok) {
        return reject(state, command, parsed.error);
      }
      return {
        state: applySettings(state, { ...state.settings, townTune: parsed.value }),
        ack: buildAck(command, 'applied', 'Town tune updated.'),
        shouldPublishState: true,
        effect: 'none',
      };
    }
    case 'previewTownTune':
      return state.settings.townTune.notes.length === 0
        ? { state, ack: buildAck(command, 'ignored', 'No town tune configured.'), shouldPublishState: false, effect: 'none' }
        : { state, ack: buildAck(command, 'accepted', 'Town tune preview requested.'), shouldPublishState: false, effect: 'previewTownTune' };
    case 'triggerHourlyFlow':
      return { state, ack: buildAck(command, 'accepted', 'Hourly flow requested.'), shouldPublishState: true, effect: 'triggerHourlyFlow' };
    case 'requestState':
      return { state, ack: buildAck(command, 'applied', 'State published.'), shouldPublishState: true, effect: 'none' };
  }
}

export function validateMqttSettings(settings: { mqtt: AppSettings['mqtt'] }): string | null {
  return isWebSocketUrl(settings.mqtt.url) ? null : 'MQTT URL must use ws:// or wss://.';
}

export function buildRemoteStateMessage(state: AppState, now = new Date()): RemoteStateMessage {
  const settings = state.settings;
  const runtime = state.runtime;

  return {
    version: 1,
    id: `state-${now.getTime()}`,
    type: 'state',
    sentAt: now.toISOString(),
    clientId: settings.mqtt.clientId,
    app: {
      ready: runtime.appReady,
      playing: runtime.audio.status === 'playing',
      audioBlocked: runtime.audio.status === 'blocked',
    },
    audio: {
      bgmVersion: settings.bgmVersion,
      bgmVolume: settings.audio.bgmVolume,
      townTuneVolume: settings.audio.townTuneVolume,
      townTuneConfigured: settings.townTune.notes.length > 0,
      loading: runtime.audio.status === 'loading',
      cacheEnabled: settings.audio.cacheEnabled,
      currentTrack: runtime.audio.currentTrack,
    },
    weather: {
      mode: settings.weather.mode,
      value: runtime.weather.value,
      locationLabel: runtime.weather.locationLabel,
      temperature: runtime.weather.temperature,
      temperatureMax: runtime.weather.temperatureMax,
      temperatureMin: runtime.weather.temperatureMin,
    },
    mqtt: {
      status: runtime.mqtt.status,
      baseTopic: settings.mqtt.baseTopic,
      qos: settings.mqtt.qos,
      retainState: settings.mqtt.retainState,
    },
  };
}
