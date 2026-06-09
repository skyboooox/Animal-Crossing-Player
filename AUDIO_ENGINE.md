# Animal-Crossing-Player 音频引擎设计

## 文档定位

本文定义 BGM 选择、加载、缓存、播放、整点流程和失败恢复。资源事实见 [AUDIO_ASSETS.md](AUDIO_ASSETS.md)，状态字段见 [STATE_MODEL.md](STATE_MODEL.md)。

## 输入

音频引擎输入：

- `audio.json` manifest。
- 当前小时。
- 当前天气：Sunny / Rainy / Snowy。
- 当前 BGM 版本。
- BGM 音量。
- 岛歌音量。
- 岛歌音符。
- 缓存开关。

## BGM 选择算法

```text
selectTrack(version, weather, hour):
  if manifest[version][weather][hour] exists:
    return track(weather, fallbackUsed=false)
  if manifest[version].Sunny[hour] exists:
    return track(Sunny, requestedWeather=weather, fallbackUsed=true)
  throw MISSING_TRACK
```

要求：

- `hour` 使用本地时间 0..23。
- 不从文件名解析小时。
- `Wild World (DS 2005)` 在 Rainy / Snowy 时回退 Sunny。
- 回退不打断播放，但应记录到调试信息和 MQTT state 的非敏感摘要中。

## 首批加载

首批加载发生在导览第四页或关键配置切换后。

加载项：

- 当前小时 BGM。
- `bell.mp3`。
- 当前岛歌音符数据。

岛歌由 Web Audio 合成，不需要额外 mp3；如果未来改成采样音源，采样资源才进入首批加载。

加载阶段：

```text
resolve manifest
check cache
fetch if missing
decode audio
prepare buffers
mark ready
```

进度状态：

- `checkingCache`
- `downloading`
- `decoding`
- `cached`
- `ready`
- `failed`

## 播放启动

点击 `开始` 后：

1. 确保首批加载完成。
2. 在用户手势内 resume / create AudioContext。
3. 播放当前 BGM。
4. 进入首页。
5. 立即预加载下一小时 BGM。

如果浏览器阻止音频：

- 设置 audio status 为 `blocked`。
- 显示阻塞浮层要求用户点击授权。
- 不在首页显示播放状态或错误状态。

## 下一小时预加载

播放开始后预加载：

```text
nextHour = (currentHour + 1) % 24
nextTrack = selectTrack(version, weather, nextHour)
load nextTrack with cache
```

预加载失败不停止当前播放；记录错误并在下一小时到达前重试。

## 整点流程

整点触发来源：

- 本地时间进入下一小时。
- MQTT `triggerHourlyFlow`。
- 调试 / 测试命令。

流程：

```text
if already transitioning:
  ignore duplicate trigger
fade out current BGM
play town tune if configured
play bell
switch to next hour BGM
fade in BGM
preload following hour
```

没有岛歌时：

```text
fade out current BGM
play bell
switch to next hour BGM
fade in BGM
```

音量：

- BGM 使用 `bgmVolume`。
- 岛歌使用 `townTuneVolume`。
- 钟声默认跟随 `townTuneVolume`。

## 缓存接口

音频引擎不直接调用 `caches`。它使用 `audioCacheService`：

```ts
interface AudioCacheService {
  get(url: string): Promise<Response | null>;
  put(url: string, response: Response): Promise<void>;
  deleteMany(urls: string[]): Promise<void>;
  estimate(): Promise<CacheEstimate>;
}
```

缓存失败时，音频引擎回退网络加载。

## 失败恢复

| 错误 | 行为 |
| --- | --- |
| manifest 加载失败 | 阻塞导览，允许 Retry |
| 当前 BGM 缺失 | 尝试 Sunny 回退，仍失败则阻塞 |
| bell 缺失 | 阻塞整点流程，允许无钟声继续播放 BGM |
| 解码失败 | Retry；仍失败则阻塞当前启动 |
| 下一小时预加载失败 | 不阻塞，记录并延迟重试 |
| AudioContext blocked | 显示授权浮层 |
| CacheStorage 写入失败 | 继续播放并记录 |

## 测试要求

- 每个版本 0..23 点选择测试。
- Rainy / Snowy 回退测试。
- 首批加载进度测试。
- 下一小时跨午夜测试。
- 整点流程有岛歌 / 无岛歌测试。
- 音量分离测试。
- 缓存命中和缓存失败测试。
