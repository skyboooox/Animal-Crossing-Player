# Animal-Crossing-Player

Animal-Crossing-Player 是一个浏览器端动森氛围时钟与音乐播放器。重构目标是用 React + Vite 和 `animal-island-ui` 做一个安静的首页：只显示时间、日期、可选农历与天气，音频播放、岛歌、背景、天气位置、MQTT 远控等复杂设置都收进导览和设置页。

当前仓库处于重构规格完成阶段，代码实现还未开始。旧项目 `/Users/skybox/Documents/GitHub/Animal-Crossing-Player.old` 只作为行为参考，不作为新架构模板。

## 文档入口

| 文件 | 用途 |
| --- | --- |
| [DOCUMENTATION.md](DOCUMENTATION.md) | 文档体系、职责边界和参考规范 |
| [PROJECT.md](PROJECT.md) | 产品边界、目标、非目标、验收标准 |
| [UI_UX.md](UI_UX.md) | 导览、首页、设置、状态、错误、视觉和可访问性 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | React + Vite 四层架构、数据流、边界 |
| [STATE_MODEL.md](STATE_MODEL.md) | 设置、运行态、导出配置、协议状态的数据结构 |
| [AUDIO_ASSETS.md](AUDIO_ASSETS.md) | 本地音频和背景资源清单 |
| [AUDIO_ENGINE.md](AUDIO_ENGINE.md) | BGM 选择、整点流程、音频加载和缓存接口 |
| [TOWN_TUNE.md](TOWN_TUNE.md) | NookNet 岛歌 URL 解析与播放规则 |
| [WEATHER_TIME.md](WEATHER_TIME.md) | Open-Meteo 天气、自动定位、手动天气、时间与农历 |
| [BROWSER_STORAGE.md](BROWSER_STORAGE.md) | CacheStorage、IndexedDB、OPFS、MQTT 凭据和导入导出 |
| [MQTT_PROTOCOL.md](MQTT_PROTOCOL.md) | MQTT over WebSocket topic、payload、ACK、state |
| [DEVELOPMENT.md](DEVELOPMENT.md) | 本地开发、Docker MQTT、依赖和验证命令 |
| [TEST_PLAN.md](TEST_PLAN.md) | 单元、集成、浏览器、MQTT 与验收测试矩阵 |
| [DECISIONS.md](DECISIONS.md) | 已接受的架构决策记录 |
| [PLAN.md](PLAN.md) | 分阶段实施顺序 |

## 已确认默认值

- 技术栈：React + Vite。
- 架构：`L1_Entry` / `L2_Core` / `L3_Business` / `L4_Atom` 四层标准。
- UI：`animal-island-ui`。
- 默认语言：English。
- 默认天气：自动定位，定位或天气失败时回退 Sunny。
- 默认 BGM：`New Horizons (Switch 2021)`。
- 默认岛歌：无。
- 岛歌导入：只支持 NookNet URL。
- 首页：只显示时间、日期、可选农历、天气。
- MQTT：只支持 `ws://` 或 `wss://`。

## 本地 MQTT

本仓库提供本地 Mosquitto 服务用于浏览器 MQTT 联调。

```sh
docker compose -f docker-compose.mqtt.yml up -d
```

连接信息：

```text
WebSocket URL: ws://localhost:9001
TCP URL: mqtt://localhost:1883
Username: acplayer
Password: acplayer-dev
```

浏览器应用只能使用 WebSocket URL。TCP URL 只用于命令行验证。

## 当前状态

- `public/assets` 已包含音频、`audio.json`、`bell.mp3` 和 15 张背景预设图。
- 本地 Docker MQTT broker 已可运行。
- 下一步是按 [PLAN.md](PLAN.md) 阶段 0 开始 React + Vite 项目基线实现。
