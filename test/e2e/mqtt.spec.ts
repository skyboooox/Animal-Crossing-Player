import { expect, test } from '@playwright/test';
import mqtt from 'mqtt';

function createSettings(clientId: string) {
  return {
    schemaVersion: 1,
    language: 'en',
    onboardingCompleted: true,
    bgmVersion: 'New Horizons (Switch 2021)',
    weather: {
      mode: 'manual',
      manualValue: 'Sunny',
      manualLocationLabel: 'MQTT Test',
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
    },
    display: {
      motion: 'full',
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

test('MQTT setVolume returns ACK and requestState publishes no password', async ({ page }, testInfo) => {
  const testSuffix = `${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}-${Math.random().toString(36).slice(2)}`.replace(
    /[^a-zA-Z0-9-]/g,
    '-',
  );
  const clientId = `acp-e2e-${testSuffix}`;
  const settings = createSettings(clientId);
  const baseTopic = settings.mqtt.baseTopic;
  const commandTopic = `${baseTopic}/command`;
  const ackTopic = `${baseTopic}/ack`;
  const stateTopic = `${baseTopic}/state`;
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
  await expect(page.getByRole('dialog')).toContainText('Start island radio');
  const start = page.getByRole('button', { name: 'Start', exact: true });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await page.getByRole('button', { name: /Remote.*MQTT connection and remote log/ }).click();
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

  client.subscribe([ackTopic, stateTopic]);

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
