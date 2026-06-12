import { BGM_VERSIONS } from '../types';
import type { MqttSettings, RemoteAck, RemoteCommand, RemoteStateMessage } from '../types';

export function parseMqttJson(payload: Uint8Array | string): unknown {
  const text = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
  return JSON.parse(text);
}

export function stringifyMqttJson(value: RemoteAck | RemoteStateMessage | Record<string, unknown>): string {
  return JSON.stringify(value);
}

export function isRemoteCommand(value: unknown): value is RemoteCommand {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.version === 1 && typeof record.id === 'string' && typeof record.type === 'string';
}

export function buildMqttTopics(baseTopic: string, clientId: string) {
  const base = baseTopic.replace('{clientId}', clientId).replace(/\/+$/, '');
  return {
    command: `${base}/command`,
    ack: `${base}/ack`,
    state: `${base}/state`,
    event: `${base}/event`,
    error: `${base}/error`,
    availability: `${base}/availability`,
    homeAssistantStatus: 'homeassistant/status',
  };
}

export interface MqttDiscoveryMessage {
  payload: string;
  topic: string;
}

type HomeAssistantComponent = 'binary_sensor' | 'button' | 'number' | 'select' | 'sensor';
type HomeAssistantDiscoveryConfig = Record<string, unknown>;

const HOME_ASSISTANT_DISCOVERY_PREFIX = 'homeassistant';

function toHomeAssistantObjectId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'animal_crossing_player';
}

function stringifyCommand(command: Record<string, unknown>): string {
  return JSON.stringify({ version: 1, source: 'homeassistant', ...command });
}

function buildNumberCommandTemplate(target: 'bgm' | 'townTune'): string {
  return `{"version":1,"id":"ha-${target}-volume-{{ now().timestamp() | int }}","type":"setVolume","target":"${target}","value":{{ value | float }},"source":"homeassistant"}`;
}

function buildBgmVersionCommandTemplate(): string {
  return '{"version":1,"id":"ha-bgm-version-{{ now().timestamp() | int }}","type":"setBgmVersion","value":"{{ value }}","source":"homeassistant"}';
}

export function buildHomeAssistantDiscoveryMessages(settings: MqttSettings): MqttDiscoveryMessage[] {
  const topics = buildMqttTopics(settings.baseTopic, settings.clientId);
  const deviceId = `animal_crossing_player_${toHomeAssistantObjectId(settings.clientId)}`;
  const objectPrefix = toHomeAssistantObjectId(settings.clientId);
  const shared = {
    availability_topic: topics.availability,
    device: {
      identifiers: [deviceId],
      manufacturer: 'Animal Crossing Player',
      model: 'Browser island radio',
      name: 'Animal Crossing Player',
    },
    payload_available: 'online',
    payload_not_available: 'offline',
  };

  const components: Array<{
    component: HomeAssistantComponent;
    config: HomeAssistantDiscoveryConfig;
    objectId: string;
  }> = [
    {
      component: 'binary_sensor',
      objectId: 'playing',
      config: {
        icon: 'mdi:music',
        name: 'Playing',
        payload_off: 'OFF',
        payload_on: 'ON',
        state_topic: topics.state,
        value_template: "{{ 'ON' if value_json.app.playing else 'OFF' }}",
      },
    },
    {
      component: 'sensor',
      objectId: 'weather',
      config: {
        icon: 'mdi:weather-partly-cloudy',
        name: 'Weather',
        state_topic: topics.state,
        value_template: '{{ value_json.weather.value }}',
      },
    },
    {
      component: 'sensor',
      objectId: 'location',
      config: {
        icon: 'mdi:map-marker',
        name: 'Location',
        state_topic: topics.state,
        value_template: '{{ value_json.weather.locationLabel }}',
      },
    },
    {
      component: 'sensor',
      objectId: 'temperature',
      config: {
        device_class: 'temperature',
        name: 'Temperature',
        state_class: 'measurement',
        state_topic: topics.state,
        unit_of_measurement: '°C',
        value_template: '{{ value_json.weather.temperature }}',
      },
    },
    {
      component: 'select',
      objectId: 'bgm_version',
      config: {
        command_template: buildBgmVersionCommandTemplate(),
        command_topic: topics.command,
        icon: 'mdi:music-box-multiple',
        name: 'BGM version',
        options: [...BGM_VERSIONS],
        state_topic: topics.state,
        value_template: '{{ value_json.audio.bgmVersion }}',
      },
    },
    {
      component: 'number',
      objectId: 'bgm_volume',
      config: {
        command_template: buildNumberCommandTemplate('bgm'),
        command_topic: topics.command,
        max: 1,
        min: 0,
        mode: 'slider',
        name: 'BGM volume',
        state_topic: topics.state,
        step: 0.01,
        value_template: '{{ value_json.audio.bgmVolume }}',
      },
    },
    {
      component: 'number',
      objectId: 'town_tune_volume',
      config: {
        command_template: buildNumberCommandTemplate('townTune'),
        command_topic: topics.command,
        max: 1,
        min: 0,
        mode: 'slider',
        name: 'Town tune volume',
        state_topic: topics.state,
        step: 0.01,
        value_template: '{{ value_json.audio.townTuneVolume }}',
      },
    },
    {
      component: 'button',
      objectId: 'request_state',
      config: {
        command_topic: topics.command,
        icon: 'mdi:sync',
        name: 'Request state',
        payload_press: stringifyCommand({ id: 'ha-request-state', type: 'requestState' }),
      },
    },
    {
      component: 'button',
      objectId: 'refresh_weather',
      config: {
        command_topic: topics.command,
        icon: 'mdi:weather-cloudy-clock',
        name: 'Refresh weather',
        payload_press: stringifyCommand({ id: 'ha-refresh-weather', type: 'refreshWeather' }),
      },
    },
    {
      component: 'button',
      objectId: 'trigger_hourly_flow',
      config: {
        command_topic: topics.command,
        icon: 'mdi:bell-ring',
        name: 'Trigger hourly flow',
        payload_press: stringifyCommand({ id: 'ha-trigger-hourly-flow', type: 'triggerHourlyFlow' }),
      },
    },
  ];

  return components.map(({ component, config, objectId }) => {
    const uniqueId = `${objectPrefix}_${objectId}`;
    return {
      topic: `${HOME_ASSISTANT_DISCOVERY_PREFIX}/${component}/${uniqueId}/config`,
      payload: JSON.stringify({
        ...shared,
        ...config,
        unique_id: uniqueId,
      }),
    };
  });
}
