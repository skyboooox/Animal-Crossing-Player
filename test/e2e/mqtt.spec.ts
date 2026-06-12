import { expect, test } from '@playwright/test';
import mqtt from 'mqtt';
import { connect } from 'node:net';

function isTcpPortOpen(host: string, port: number, timeoutMs = 500) {
  return new Promise<boolean>((resolve) => {
    const socket = connect({ host, port });
    const finish = (open: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}

function createSettings(clientId: string) {
  return {
    schemaVersion: 1,
    language: 'en',
    onboardingCompleted: true,
    bgmVersion: 'New Horizons (Switch 2021)',
    weather: {
      mode: 'manual',
      manualValue: 'Sunny',
      manualLocationLabel: '',
      lastAuto: null,
    },
    audio: {
      bgmVolume: 0.7,
      townTuneVolume: 0.8,
      hourlyFlowEnabled: true,
      preloadNextHour: true,
      cacheEnabled: false,
      fadeMs: 1800,
    },
    townTune: {
      url: null,
      title: null,
      notes: [],
    },
    time: {
      hourCycle: '24h',
      lunarEnabled: false,
    },
    background: {
      kind: 'preset',
      solidColor: '#E8F6EF',
      presetId: '0',
      uploadedImageId: null,
      readabilityOverlay: true,
      presetPanEnabled: true,
    },
    mqtt: {
      enabled: true,
      url: 'ws://localhost:9001',
      clientId,
      username: 'acplayer',
      password: 'acplayer-dev',
      saveCredentials: true,
      baseTopic: `ac-player/v1/${clientId}`,
      qos: 0,
      retainState: true,
      retainCommand: false,
    },
  };
}

function waitForMessage(client: mqtt.MqttClient, topic: string, predicate: (payload: Record<string, unknown>) => boolean) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${topic}`)), 10_000);
    const handler = (receivedTopic: string, buffer: Buffer) => {
      if (receivedTopic !== topic) {
        return;
      }
      const payload = JSON.parse(buffer.toString()) as Record<string, unknown>;
      if (predicate(payload)) {
        clearTimeout(timer);
        client.off('message', handler);
        resolve(payload);
      }
    };
    client.on('message', handler);
  });
}

function waitForAnyJsonMessage(
  client: mqtt.MqttClient,
  predicate: (topic: string, payload: Record<string, unknown>) => boolean,
  timeoutMs = 10_000,
) {
  return new Promise<{ payload: Record<string, unknown>; topic: string }>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for MQTT JSON message')), timeoutMs);
    const handler = (topic: string, buffer: Buffer) => {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(buffer.toString()) as Record<string, unknown>;
      } catch {
        return;
      }
      if (predicate(topic, payload)) {
        clearTimeout(timer);
        client.off('message', handler);
        resolve({ topic, payload });
      }
    };
    client.on('message', handler);
  });
}

function waitForRawMessage(client: mqtt.MqttClient, topic: string, predicate: (payload: string) => boolean, timeoutMs = 10_000) {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${topic}`)), timeoutMs);
    const handler = (receivedTopic: string, buffer: Buffer) => {
      const payload = buffer.toString();
      if (receivedTopic === topic && predicate(payload)) {
        clearTimeout(timer);
        client.off('message', handler);
        resolve(payload);
      }
    };
    client.on('message', handler);
  });
}

function subscribe(client: mqtt.MqttClient, topics: string[]) {
  return new Promise<void>((resolve, reject) => {
    client.subscribe(topics, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

test('MQTT setVolume returns ACK and requestState publishes no password', async ({ page }, testInfo) => {
  const testSuffix = `${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}-${Math.random().toString(36).slice(2)}`.replace(
    /[^a-zA-Z0-9-]/g,
    '-',
  );
  const clientId = `acp-e2e-${testSuffix}`;
  const settings = createSettings(clientId);
  const brokerUrl = new URL(settings.mqtt.url);
  test.skip(
    !(await isTcpPortOpen(brokerUrl.hostname, Number(brokerUrl.port || 80))),
    'Local MQTT WebSocket broker is not running. Start it with docker compose -f docker-compose.mqtt.yml up -d.',
  );
  const baseTopic = settings.mqtt.baseTopic;
  const commandTopic = `${baseTopic}/command`;
  const ackTopic = `${baseTopic}/ack`;
  const stateTopic = `${baseTopic}/state`;
  const availabilityTopic = `${baseTopic}/availability`;
  const volumeCommandId = `cmd-volume-${testSuffix}`;
  const stateCommandId = `cmd-state-${testSuffix}`;

  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
    },
    { savedSettings: settings },
  );

  await page.goto('/');
  await expect(page.getByRole('main', { name: 'Home', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).not.toContainText('Start island radio');
  await expect(page.getByRole('dialog')).toContainText('Loading audio');
  const start = page.getByRole('button', { name: 'Start', exact: true });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await page.getByRole('button', { name: /Remote control.*MQTT connection and remote logs/ }).click();
  await expect(page.getByText('Status: Connected', { exact: true })).toBeVisible({ timeout: 10_000 });

  const client = mqtt.connect('ws://localhost:9001', {
    clientId: `remote-e2e-${testSuffix}`,
    username: 'acplayer',
    password: 'acplayer-dev',
    reconnectPeriod: 0,
  });

  await new Promise<void>((resolve, reject) => {
    client.once('connect', () => resolve());
    client.once('error', reject);
  });

  const availabilityPromise = waitForRawMessage(client, availabilityTopic, (payload) => payload === 'online');
  const discoveryPromise = waitForAnyJsonMessage(
    client,
    (topic, payload) =>
      topic === `homeassistant/number/${clientId}_bgm_volume/config` &&
      payload.state_topic === stateTopic &&
      payload.command_topic === commandTopic &&
      payload.availability_topic === availabilityTopic,
  );
  await subscribe(client, [ackTopic, stateTopic, availabilityTopic, 'homeassistant/#']);
  await availabilityPromise;
  const discovery = await discoveryPromise;
  expect(discovery.payload.unique_id).toBe(`${clientId}_bgm_volume`);
  expect(JSON.stringify(discovery.payload)).not.toContain('acplayer-dev');

  client.publish(
    commandTopic,
    JSON.stringify({
      version: 1,
      id: volumeCommandId,
      type: 'setVolume',
      target: 'bgm',
      value: 0.5,
      sentAt: new Date().toISOString(),
    }),
  );

  const ack = await waitForMessage(client, ackTopic, (payload) => payload.commandId === volumeCommandId);
  expect(ack.status).toBe('applied');

  client.publish(
    commandTopic,
    JSON.stringify({
      version: 1,
      id: stateCommandId,
      type: 'requestState',
      sentAt: new Date().toISOString(),
    }),
  );

  const state = await waitForMessage(client, stateTopic, (payload) => payload.type === 'state');
  expect(JSON.stringify(state)).not.toContain('acplayer-dev');
  expect((state.audio as { bgmVolume: number }).bgmVolume).toBe(0.5);

  client.end(true);
});
