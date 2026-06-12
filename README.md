# Animal-Crossing-Player

一个放在浏览器里的动森氛围钟。

打开它，页面只安静地显示时间、日期、天气和岛屿背景；音乐会按当前小时、天气和你选择的游戏版本自动播放。整点时，它会播放岛歌和钟声。

[在线预览](https://animal-crossing-player.pages.dev/)

## 它能做什么

- 按现实时间播放每小时 BGM。
- 支持晴天、雨天、雪天的天气音乐。
- 可选择 `New Horizons`、`New Leaf`、`City Folk`、`Wild World` 音乐版本。
- 可导入 NookNet 岛歌链接，用在预览和整点报时里。
- 可显示天气、农历、24 小时制时间和自定义背景。
- 可作为 PWA 安装到桌面或手机主屏幕。
- 可选 MQTT WebSocket 远程控制，适合接入 Home Assistant 一类的自动化系统。

## 怎么用

直接打开在线预览。

首次进入会看到岛屿设置：选语言、选 BGM 版本、填或跳过岛歌，然后让浏览器加载音频。浏览器通常需要你点一次“启用音频”，音乐才会开始播放。

首页刻意保持很少内容。更多东西都在右上角设置里：

- 声音：音乐版本、音量、岛歌、整点报时、音频缓存。
- 显示：天气位置、背景、日期、时间格式。
- 远控：MQTT WebSocket 地址、Topic、状态和日志。
- 系统：语言、配置导入导出、本地数据维护。

## 本地运行

```sh
npm install
npm run dev
```

常用检查：

```sh
npm run test
npm run lint
npm run build
```

如果要测试 MQTT 远控，可以启动本地 WebSocket broker：

```sh
docker compose -f docker-compose.mqtt.yml up -d
```

本地开发时 MQTT 地址填：

```txt
ws://localhost:9001
```

关闭 broker：

```sh
docker compose -f docker-compose.mqtt.yml down
```

## 给开发者

这个项目是 React + Vite + TypeScript 的浏览器应用。主要产品边界和工程说明放在这些文件里：

- `PROJECT.md`：项目目标、范围、非目标和验收标准。
- `ARCHITECTURE.md`：代码分层和依赖规则。
- `PLAN.md`：当前计划和交接状态。
- `TEST_PLAN.md`：测试与发布检查。
- `docs/contract-index.md`：行为、代码和测试之间的索引。

## 许可

代码许可证见 `LICENSE`。本项目包含音乐和图片资源；正式分发前请单独确认这些素材的来源和授权。
