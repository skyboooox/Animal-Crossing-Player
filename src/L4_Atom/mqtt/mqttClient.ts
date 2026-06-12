import mqtt, { type MqttClient } from 'mqtt';
import type { MqttSettings } from '../types';
import { isWebSocketUrl } from '../utils/url';
import { buildMqttTopics } from './mqttJson';

export interface BrowserMqttClient {
  connect(): Promise<void>;
  disconnect(): void;
  publish(topic: string, payload: string, options?: { qos?: 0 | 1; retain?: boolean }): void;
  subscribe(topic: string, onMessage: (payload: Uint8Array) => void): Promise<void>;
}

export function createBrowserMqttClient(settings: MqttSettings): BrowserMqttClient {
  if (!isWebSocketUrl(settings.url)) {
    throw new Error('MQTT URL must use ws:// or wss://.');
  }

  let client: MqttClient | null = null;
  const subscriptions = new Map<string, (payload: Uint8Array) => void>();
  const topics = buildMqttTopics(settings.baseTopic, settings.clientId);

  return {
    connect() {
      return new Promise((resolve, reject) => {
        client = mqtt.connect(settings.url, {
          clientId: settings.clientId,
          username: settings.username || undefined,
          password: settings.password || undefined,
          reconnectPeriod: 3000,
          will: {
            topic: topics.availability,
            payload: 'offline',
            qos: settings.qos,
            retain: true,
          },
        });

        client.on('connect', () => resolve());
        client.on('error', (error) => reject(error));
        client.on('message', (topic, payload) => subscriptions.get(topic)?.(payload));
      });
    },
    disconnect() {
      client?.end(true);
      client = null;
      subscriptions.clear();
    },
    publish(topic, payload, options) {
      client?.publish(topic, payload, { qos: options?.qos ?? settings.qos, retain: options?.retain ?? false });
    },
    subscribe(topic, onMessage) {
      subscriptions.set(topic, onMessage);
      if (!client) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve, reject) => {
        client?.subscribe(topic, { qos: settings.qos }, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    },
  };
}
