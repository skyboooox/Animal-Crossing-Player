# Animal-Crossing-Player 状态模型

## 文档定位

本文定义实现阶段必须遵守的数据结构。字段名是规范，代码实现应尽量直接使用这些名称。

## 基础枚举

```ts
type Language = 'en' | 'zh-CN';
type BgmVersion =
  | 'New Horizons (Switch 2021)'
  | 'New Leaf (3DS 2012)'
  | 'City Folk (Wii 2008)'
  | 'Wild World (DS 2005)';
type IslandWeather = 'Sunny' | 'Rainy' | 'Snowy';
type WeatherMode = 'auto' | 'manual';
type HourCycle = '24h' | '12h';
type BackgroundKind = 'solid' | 'preset' | 'uploaded';
type MotionMode = 'full' | 'reduced';
type MqttStatus = 'off' | 'connecting' | 'connected' | 'reconnecting' | 'error';
```

## 默认设置

```ts
const defaultSettings = {
  schemaVersion: 1,
  language: 'en',
  onboardingCompleted: false,
  bgmVersion: 'New Horizons (Switch 2021)',
  weather: {
    mode: 'auto',
    manualValue: 'Sunny',
    manualLocationLabel: 'Manual',
  },
  audio: {
    bgmVolume: 0.7,
    townTuneVolume: 0.8,
    hourlyFlowEnabled: true,
    preloadNextHour: true,
    cacheEnabled: true,
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
    enabled: false,
    url: 'ws://localhost:9001',
    clientId: '<generated acp-xxxxxxxx>',
    username: '',
    password: '',
    saveCredentials: false,
    baseTopic: 'ac-player/v1/{clientId}',
    qos: 0,
    retainState: true,
    retainCommand: false,
  },
};
```

## AppSettings

```ts
interface AppSettings {
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
```

## AudioSettings

```ts
interface AudioSettings {
  bgmVolume: number;        // 0..1
  townTuneVolume: number;   // 0..1
  hourlyFlowEnabled: boolean;
  preloadNextHour: boolean;
  cacheEnabled: boolean;
  fadeMs: number;
}
```

## TownTuneSettings

```ts
interface TownTuneSettings {
  url: string | null;
  title: string | null;
  notes: TownTuneNote[];
}

interface TownTuneNote {
  token: string;
  kind: 'note' | 'sustain' | 'rest';
  frequency: number | null;
}
```

## WeatherSettings

```ts
interface WeatherSettings {
  mode: WeatherMode;
  manualValue: IslandWeather;
  manualLocationLabel: string;
  lastAuto: WeatherSnapshot | null;
}

interface WeatherSnapshot {
  value: IslandWeather;
  locationLabel: string;
  temperature: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  weatherCode: number | null;
  updatedAt: string;
  source: 'open-meteo' | 'manual' | 'fallback';
}
```

## BackgroundSettings

```ts
interface BackgroundSettings {
  kind: BackgroundKind;
  solidColor: string;
  presetId: string | null;
  uploadedImageId: string | null;
  readabilityOverlay: boolean;
}

interface UploadedBackground {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  blob: Blob;
}
```

## MqttSettings

```ts
interface MqttSettings {
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
```

保存规则：

- `saveCredentials` 为 `false` 时，不持久化 `username` 和 `password`。
- `saveCredentials` 为 `true` 时，必须已通过明文存储确认。
- 导出包含 `password` 时必须二次确认。

## RuntimeState

```ts
interface RuntimeState {
  appReady: boolean;
  onboardingStep: 'language' | 'bgm' | 'townTune' | 'audioLoading' | null;
  audio: AudioRuntimeState;
  weather: WeatherSnapshot;
  mqtt: MqttRuntimeState;
  errors: AppError[];
}
```

```ts
interface AudioRuntimeState {
  status: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'transitioning' | 'blocked' | 'error';
  currentTrack: AudioTrackRef | null;
  nextTrack: AudioTrackRef | null;
  loadProgress: LoadProgress | null;
  cacheProgress: CacheProgress | null;
}
```

## AudioManifest

```ts
interface AudioManifest {
  [version: string]: {
    [weather in IslandWeather]?: string[]; // length should be 24 when present
  };
}

interface AudioTrackRef {
  version: BgmVersion;
  weather: IslandWeather;
  requestedWeather: IslandWeather;
  hour: number; // 0..23
  url: string;
  fallbackUsed: boolean;
}
```

## ExportedConfig

```ts
interface ExportedConfig {
  app: 'Animal-Crossing-Player';
  schemaVersion: 1;
  exportedAt: string;
  settings: AppSettings;
}
```

导入规则：

- `app` 必须匹配。
- `schemaVersion` 必须支持。
- 未知字段忽略。
- 无效字段回退默认值并记录导入警告。
- 包含 MQTT 密码时必须提示明文存储风险。
