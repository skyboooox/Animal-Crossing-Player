import type { RemoteCommand } from '../../L2_Core/types';
import { isRemoteCommand, parseMqttJson } from '../../L4_Atom/mqtt/mqttJson';

export function parseMqttCommandEntry(payload: Uint8Array | string): RemoteCommand | null {
  try {
    const parsed = parseMqttJson(payload);
    return isRemoteCommand(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
