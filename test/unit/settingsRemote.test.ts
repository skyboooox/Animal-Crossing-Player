import { describe, expect, it } from 'vitest';
import { createInitialAppState } from '../../src/L2_Core/appState';
import { buildRemoteStateMessage, handleRemoteCommand, validateMqttSettings } from '../../src/L2_Core/remoteControlCore';
import { createDefaultSettings } from '../../src/L3_Business/settings/defaults';
import { exportConfig, importConfig, normalizeSettings } from '../../src/L3_Business/settings/importExportConfig';
import { sanitizeSettingsForStorage } from '../../src/L3_Business/settings/sanitizeSensitiveConfig';
import { buildHomeAssistantDiscoveryMessages, buildMqttTopics } from '../../src/L4_Atom/mqtt/mqttJson';
import { fixtureManifest } from '../helpers/assetManifest';

describe('settings and remote control', () => {
  it('does not persist credentials when saveCredentials is false', () => {
    const settings = createDefaultSettings();
    settings.mqtt.username = 'user';
    settings.mqtt.password = 'secret';
    settings.mqtt.saveCredentials = false;
    const sanitized = sanitizeSettingsForStorage(settings);
    expect(sanitized.mqtt.username).toBe('');
    expect(sanitized.mqtt.password).toBe('');
  });

  it('normalizes imported settings and keeps generated client id', () => {
    const settings = normalizeSettings({ audio: { bgmVolume: 2, preloadNextHour: false }, mqtt: { clientId: 'acp-test' } }, createDefaultSettings());
    expect(settings.audio.bgmVolume).toBe(1);
    expect(settings.audio.preloadNextHour).toBe(true);
    expect(settings.mqtt.clientId).toBe('acp-test');
  });

  it('exports and imports config envelope', () => {
    const settings = createDefaultSettings();
    const exported = exportConfig(settings, new Date('2026-06-09T12:00:00Z'));
    const imported = importConfig(exported, createDefaultSettings());
    expect(imported.warnings).toEqual([]);
    expect(imported.settings.bgmVersion).toBe(settings.bgmVersion);
  });

  it('rejects TCP MQTT URLs', () => {
    const settings = createDefaultSettings();
    settings.mqtt.url = 'mqtt://localhost:1883';
    expect(validateMqttSettings(settings)).toContain('ws:// or wss://');
  });

  it('applies setVolume and returns ACK', () => {
    const state = createInitialAppState(createDefaultSettings(), fixtureManifest);
    const result = handleRemoteCommand(state, {
      version: 1,
      id: 'cmd-volume-1',
      type: 'setVolume',
      target: 'bgm',
      value: 0.5,
    });
    expect(result.ack.status).toBe('applied');
    expect(result.state.settings.audio.bgmVolume).toBe(0.5);
  });

  it('treats remote manual weather as a manual location', () => {
    const state = createInitialAppState(createDefaultSettings(), fixtureManifest);
    const result = handleRemoteCommand(state, {
      version: 1,
      id: 'cmd-weather-1',
      type: 'setWeather',
      mode: 'manual',
      locationLabel: 'Hong Kong',
    });

    expect(result.ack.status).toBe('accepted');
    expect(result.effect).toBe('refreshWeather');
    expect(result.state.settings.weather.mode).toBe('manual');
    expect(result.state.settings.weather.manualLocationLabel).toBe('Hong Kong');
    expect(result.state.settings.weather.manualValue).toBe('Sunny');
  });

  it('rejects remote manual weather without a location', () => {
    const state = createInitialAppState(createDefaultSettings(), fixtureManifest);
    const result = handleRemoteCommand(state, {
      version: 1,
      id: 'cmd-weather-2',
      type: 'setWeather',
      mode: 'manual',
      weather: 'Rainy',
    });

    expect(result.ack.status).toBe('rejected');
    expect(result.ack.message).toContain('location');
  });

  it('publishes state without password fields', () => {
    const settings = createDefaultSettings();
    settings.mqtt.password = 'secret';
    const state = createInitialAppState(settings, fixtureManifest);
    const message = buildRemoteStateMessage(state);
    expect(JSON.stringify(message)).not.toContain('secret');
  });

  it('builds Home Assistant MQTT discovery entities', () => {
    const settings = createDefaultSettings();
    settings.mqtt.clientId = 'acp-test';
    const topics = buildMqttTopics(settings.mqtt.baseTopic, settings.mqtt.clientId);
    const messages = buildHomeAssistantDiscoveryMessages(settings.mqtt);
    const byTopic = new Map(messages.map((message) => [message.topic, JSON.parse(message.payload) as Record<string, unknown>]));

    expect(topics.availability).toBe('ac-player/v1/acp-test/availability');
    expect(messages).toHaveLength(10);
    expect(byTopic.has('homeassistant/binary_sensor/acp-test_playing/config')).toBe(true);

    const bgmVolume = byTopic.get('homeassistant/number/acp-test_bgm_volume/config');
    expect(bgmVolume?.state_topic).toBe('ac-player/v1/acp-test/state');
    expect(bgmVolume?.command_topic).toBe('ac-player/v1/acp-test/command');
    expect(bgmVolume?.availability_topic).toBe('ac-player/v1/acp-test/availability');
    expect(String(bgmVolume?.command_template)).toContain('"type":"setVolume"');

    const bgmVersion = byTopic.get('homeassistant/select/acp-test_bgm_version/config');
    expect(bgmVersion?.command_topic).toBe('ac-player/v1/acp-test/command');
    expect(bgmVersion?.options).toContain('New Horizons (Switch 2021)');

    const requestState = byTopic.get('homeassistant/button/acp-test_request_state/config');
    expect(requestState?.payload_press).toContain('"type":"requestState"');
    expect(requestState?.device).toMatchObject({
      identifiers: ['animal_crossing_player_acp-test'],
      name: 'Animal Crossing Player',
    });
  });
});
