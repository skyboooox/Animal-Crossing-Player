import type { RemoteAck, RemoteCommand, RemoteStateMessage } from '../types';

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
    discovery: 'ac-player/v1/discovery',
  };
}
