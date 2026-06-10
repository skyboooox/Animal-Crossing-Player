import type { AppSettings, RemoteStateMessage } from '../../L4_Atom/types';

export function sanitizeSettingsForStorage(settings: AppSettings): AppSettings {
  if (settings.mqtt.saveCredentials) {
    return settings;
  }

  return {
    ...settings,
    mqtt: {
      ...settings.mqtt,
      username: '',
      password: '',
    },
  };
}

export function hasExportedPassword(settings: AppSettings): boolean {
  return settings.mqtt.saveCredentials && settings.mqtt.password.trim().length > 0;
}

export function redactRemoteState<T extends RemoteStateMessage>(state: T): T {
  return state;
}
