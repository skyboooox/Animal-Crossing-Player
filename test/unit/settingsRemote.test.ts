import { describe, expect, it } from 'vitest';
import { createInitialAppState } from '../../src/L2_Core/appState';
import { buildRemoteStateMessage, handleRemoteCommand, validateMqttSettings } from '../../src/L2_Core/remoteControlCore';
import { createDefaultSettings } from '../../src/L3_Business/settings/defaults';
import { exportConfig, importConfig, normalizeSettings } from '../../src/L3_Business/settings/importExportConfig';
import { sanitizeSettingsForStorage } from '../../src/L3_Business/settings/sanitizeSensitiveConfig';
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
    const settings = normalizeSettings({ audio: { bgmVolume: 2 }, mqtt: { clientId: 'acp-test' } }, createDefaultSettings());
    expect(settings.audio.bgmVolume).toBe(1);
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

  it('publishes state without password fields', () => {
    const settings = createDefaultSettings();
    settings.mqtt.password = 'secret';
    const state = createInitialAppState(settings, fixtureManifest);
    const message = buildRemoteStateMessage(state);
    expect(JSON.stringify(message)).not.toContain('secret');
  });
});
