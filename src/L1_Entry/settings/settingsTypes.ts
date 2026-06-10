export type SettingsCategory = 'Audio' | 'Island' | 'Remote' | 'App';
export type SettingsSubPage =
  | 'Playback'
  | 'Town Tune'
  | 'Audio Cache'
  | 'Weather & Location'
  | 'Background'
  | 'Date & Time'
  | 'MQTT Connection'
  | 'Remote Log'
  | 'Language'
  | 'Display'
  | 'Maintenance & Debug';

export const SETTINGS_TREE: Record<SettingsCategory, SettingsSubPage[]> = {
  Audio: ['Playback', 'Town Tune', 'Audio Cache'],
  Island: ['Weather & Location', 'Background', 'Date & Time'],
  Remote: ['MQTT Connection', 'Remote Log'],
  App: ['Language', 'Display', 'Maintenance & Debug'],
};
