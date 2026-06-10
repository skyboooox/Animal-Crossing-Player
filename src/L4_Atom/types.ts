export const BGM_VERSIONS = [
  'New Horizons (Switch 2021)',
  'New Leaf (3DS 2012)',
  'City Folk (Wii 2008)',
  'Wild World (DS 2005)',
] as const;

export const WEATHER_VALUES = ['Sunny', 'Rainy', 'Snowy'] as const;
export const LANGUAGES = ['en', 'zh-CN'] as const;

export type Language = (typeof LANGUAGES)[number];
export type BgmVersion = (typeof BGM_VERSIONS)[number];
export type IslandWeather = (typeof WEATHER_VALUES)[number];
export type WeatherMode = 'auto' | 'manual';
export type HourCycle = '24h' | '12h';
export type BackgroundKind = 'solid' | 'preset' | 'uploaded';
export type MotionMode = 'full' | 'reduced';
export type MqttStatus = 'off' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface AudioSettings {
  bgmVolume: number;
  townTuneVolume: number;
  hourlyFlowEnabled: boolean;
  preloadNextHour: boolean;
  cacheEnabled: boolean;
  fadeMs: number;
}

export interface TownTuneSettings {
  url: string | null;
  title: string | null;
  notes: TownTuneNote[];
}

export interface TownTuneNote {
  token: string;
  kind: 'note' | 'sustain' | 'rest';
  frequency: number | null;
}

export interface WeatherSettings {
  mode: WeatherMode;
  manualValue: IslandWeather;
  manualLocationLabel: string;
  lastAuto: WeatherSnapshot | null;
}

export interface WeatherSnapshot {
  value: IslandWeather;
  locationLabel: string;
  temperature: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  weatherCode: number | null;
  updatedAt: string;
  source: 'open-meteo' | 'manual' | 'fallback';
}

export interface TimeSettings {
  hourCycle: HourCycle;
  lunarEnabled: boolean;
}

export interface BackgroundSettings {
  kind: BackgroundKind;
  solidColor: string;
  presetId: string | null;
  uploadedImageId: string | null;
  readabilityOverlay: boolean;
}

export interface UploadedBackground {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  blob: Blob;
}

export interface DisplaySettings {
  motion: MotionMode;
}

export interface MqttSettings {
  enabled: boolean;
  url: string;
  clientId: string;
  username: string;
  password: string;
  saveCredentials: boolean;
  baseTopic: string;
  qos: 0 | 1;
  retainState: boolean;
  retainCommand: false;
}

export interface AppSettings {
  schemaVersion: 1;
  language: Language;
  onboardingCompleted: boolean;
  bgmVersion: BgmVersion;
  weather: WeatherSettings;
  audio: AudioSettings;
  townTune: TownTuneSettings;
  time: TimeSettings;
  background: BackgroundSettings;
  mqtt: MqttSettings;
  display: DisplaySettings;
}

export interface RuntimeState {
  appReady: boolean;
  onboardingStep: 'language' | 'bgm' | 'townTune' | 'audioLoading' | null;
  startupAudioPromptOpen: boolean;
  audio: AudioRuntimeState;
  weather: WeatherSnapshot;
  mqtt: MqttRuntimeState;
  errors: AppError[];
}

export interface AudioRuntimeState {
  status: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'transitioning' | 'blocked' | 'error';
  currentTrack: AudioTrackRef | null;
  nextTrack: AudioTrackRef | null;
  loadProgress: LoadProgress | null;
  cacheProgress: CacheProgress | null;
}

export interface LoadProgress {
  done: number;
  total: number;
  label: string;
  status: 'checkingCache' | 'downloading' | 'decoding' | 'cached' | 'ready' | 'failed';
}

export interface CacheProgress {
  done: number;
  total: number;
  bytes?: number;
}

export interface MqttRuntimeState {
  status: MqttStatus;
  lastError: string | null;
  connectedAt: string | null;
}

export interface AppError {
  id: string;
  scope: 'audio' | 'weather' | 'settings' | 'mqtt' | 'app';
  message: string;
  createdAt: string;
}

export interface AudioManifest {
  [version: string]: {
    [weather in IslandWeather]?: string[];
  };
}

export interface AudioTrackRef {
  version: BgmVersion;
  weather: IslandWeather;
  requestedWeather: IslandWeather;
  hour: number;
  url: string;
  fallbackUsed: boolean;
}

export interface ExportedConfig {
  app: 'Animal-Crossing-Player';
  schemaVersion: 1;
  exportedAt: string;
  settings: AppSettings;
}

export interface AppState {
  settings: AppSettings;
  runtime: RuntimeState;
  manifest: AudioManifest | null;
  remoteLog: RemoteLogEntry[];
}

export interface CacheEstimate {
  usage: number;
  quota: number;
}

export type RemoteCommandType =
  | 'start'
  | 'pause'
  | 'resume'
  | 'setVolume'
  | 'setBgmVersion'
  | 'setWeather'
  | 'refreshWeather'
  | 'setTownTune'
  | 'previewTownTune'
  | 'triggerHourlyFlow'
  | 'requestState';

export interface RemoteCommand {
  version: 1;
  id: string;
  type: RemoteCommandType;
  sentAt?: string;
  source?: string;
  target?: 'bgm' | 'townTune';
  value?: unknown;
  mode?: WeatherMode;
  weather?: IslandWeather;
  locationLabel?: string;
  url?: string;
}

export type AckStatus = 'accepted' | 'applied' | 'ignored' | 'rejected' | 'failed';

export interface RemoteAck {
  version: 1;
  id: string;
  commandId: string;
  type: 'ack';
  status: AckStatus;
  message: string;
  sentAt: string;
}

export interface RemoteStateMessage {
  version: 1;
  id: string;
  type: 'state';
  sentAt: string;
  clientId: string;
  app: {
    ready: boolean;
    playing: boolean;
    audioBlocked: boolean;
  };
  audio: {
    bgmVersion: BgmVersion;
    bgmVolume: number;
    townTuneVolume: number;
    townTuneConfigured: boolean;
    loading: boolean;
    cacheEnabled: boolean;
    currentTrack: AudioTrackRef | null;
  };
  weather: {
    mode: WeatherMode;
    value: IslandWeather;
    locationLabel: string;
    temperature: number | null;
    temperatureMax: number | null;
    temperatureMin: number | null;
  };
  mqtt: {
    status: MqttStatus;
    baseTopic: string;
    qos: 0 | 1;
    retainState: boolean;
  };
}

export interface RemoteLogEntry {
  id: string;
  direction: 'in' | 'out';
  kind: 'command' | 'ack' | 'state' | 'event' | 'error';
  summary: string;
  createdAt: string;
}
