# Animal-Crossing-Player 实施计划

## 文档定位

本文定义实现顺序和每阶段完成标准。产品边界看 [PROJECT.md](PROJECT.md)，架构看 [ARCHITECTURE.md](ARCHITECTURE.md)，测试矩阵看 [TEST_PLAN.md](TEST_PLAN.md)。

## 总体策略

先建可运行 React + Vite 基线和四层目录，再接 L2 状态编排、L3 领域能力、L4 平台原子能力，最后完成 L1 页面和 MQTT 验证。每阶段必须能独立验证，不把所有风险压到最后。

## 当前执行状态

| 阶段 | 状态 | 验证 |
| --- | --- | --- |
| 阶段 0：项目基线 | 已完成 | `npm run dev`、`npm run build`、`npm run test`、侧边浏览器 |
| 阶段 1：状态模型与持久化 | 已完成 | 单元测试、导入导出、刷新持久化 |
| 阶段 2：资源与音频引擎 | 已完成 | 单元测试、音频 manifest、浏览器启动流程 |
| 阶段 3：岛歌 | 已完成 | 单元测试、导览和设置预览 |
| 阶段 4：天气、时间和农历 | 已完成 | 单元测试、手动 / 自动回退流程 |
| 阶段 5：导览与首页 | 已完成 | Playwright、侧边浏览器 |
| 阶段 6：设置页 | 已完成 | Playwright、侧边浏览器 |
| 阶段 7：MQTT 远程控制 | 已完成 | Docker Mosquitto、CLI WebSocket、Playwright MQTT |
| 阶段 8：端到端验证与收口 | 已完成 | `npm run lint`、`npm run test`、`npm run build`、`npm run test:e2e`、`npm audit` |

## 阶段 0：项目基线

状态：已完成。

目标：

- 建立 React + Vite 应用。
- 建立 `src/L1_Entry`、`src/L2_Core`、`src/L3_Business`、`src/L4_Atom` 四层目录。
- 接入 `animal-island-ui/style`。
- 补齐基础脚本、TypeScript、测试框架。
- 读取 `public/assets/audio.json`。

范围：

- `package.json`。
- Vite / TS 配置。
- `src/L1_Entry`。
- `src/L4_Atom/ui`。
- `src/L4_Atom/assetManifest`。
- 基础测试配置。

完成标准：

- `npm run dev` 可启动。
- `npm run build` 通过。
- `npm run test` 通过。
- 页面能渲染一个 `animal-island-ui` 组件。
- 能列出四个 BGM 版本。

## 阶段 1：状态模型与持久化

状态：已完成。

目标：

- 实现 [STATE_MODEL.md](STATE_MODEL.md) 中的设置和运行态。
- 实现默认设置。
- 实现本地持久化。
- 实现设置导出 / 导入基础。

范围：

- `src/L2_Core/appState.ts`。
- `src/L2_Core/settingsCore.ts`。
- `src/L3_Business/settings`。
- `src/L4_Atom/storage`。

完成标准：

- 刷新后设置保持。
- 默认值与文档一致。
- `saveCredentials=false` 时不持久化 MQTT 用户名密码。
- 导出 / 导入 schema 校验可用。

## 阶段 2：资源与音频引擎

状态：已完成。

目标：

- 实现 [AUDIO_ENGINE.md](AUDIO_ENGINE.md)。
- 接入 `audio.json`。
- 实现 BGM 选择和天气回退。
- 实现首批加载、播放、下一小时预加载。

范围：

- `src/L2_Core/audioCore.ts`。
- `src/L3_Business/audio`。
- `src/L4_Atom/assetManifest`。
- `src/L4_Atom/storage/cacheStorageStore.ts`。
- `src/L4_Atom/audio`。

完成标准：

- 四个版本可选择。
- `Wild World` Rainy / Snowy 回退 Sunny。
- 当前 BGM + bell 可加载。
- 点击后可播放 BGM。
- 下一小时可预加载。

## 阶段 3：岛歌

状态：已完成。

目标：

- 实现 [TOWN_TUNE.md](TOWN_TUNE.md)。
- 支持 NookNet `melody=` URL。
- 实现 16 音符预览和 Web Audio 预览。
- 接入整点流程。

范围：

- `src/L3_Business/townTune`。
- `src/L2_Core/audioCore.ts`。
- `src/L1_Entry/onboarding/TownTuneStep.tsx`。
- `src/L1_Entry/settings/AudioSettingsPanel.tsx`。

完成标准：

- 有效 NookNet URL 可解析。
- 非 NookNet URL 被拒绝。
- 16 音符可预览。
- 没有岛歌时整点只播放 bell。

## 阶段 4：天气、时间和农历

状态：已完成。

目标：

- 实现 [WEATHER_TIME.md](WEATHER_TIME.md)。
- 接入 Geolocation + Open-Meteo。
- 支持手动天气。
- 支持 12h / 24h 和农历显示。

范围：

- `src/L2_Core/weatherCore.ts`。
- `src/L3_Business/weather`。
- `src/L3_Business/time`。
- `src/L4_Atom/weatherApi`。
- `src/L4_Atom/date`。

完成标准：

- 自动天气成功时更新首页和 BGM 选择。
- 定位拒绝或 API 失败可回退。
- 手动天气不请求 API。
- 农历开关可用。

## 阶段 5：导览与首页

状态：已完成。

目标：

- 实现四页导览。
- 实现首页极简展示。
- 实现启动流程。

范围：

- `src/L1_Entry/onboarding`。
- `src/L1_Entry/pages/HomePage.tsx`。
- `src/L2_Core/startupCore.ts`。
- `src/L2_Core/onboardingCore.ts`。

完成标准：

- 首次进入显示导览。
- `Skip` 使用默认配置并进入音频加载。
- 加载完成前 `Start` disabled。
- 首次导览完成后再次打开页面显示启动音频弹窗，先加载音频，加载完成后点击 `Start` 播放。
- 首页只显示允许内容。
- 浏览器阻止音频时出现授权浮层。

## 阶段 6：设置页

状态：已完成。

目标：

- 实现二级设置菜单。
- 覆盖 Audio / Island / Remote / App。
- 实现背景上传和本地保存。
- 实现清除、导入导出、明文密码确认。

范围：

- `src/L1_Entry/settings`。
- `src/L1_Entry/pages/SettingsPage.tsx`。
- `src/L2_Core/settingsCore.ts`。
- `src/L2_Core/backgroundCore.ts`。
- `src/L3_Business/background`。
- `src/L4_Atom/storage`。

完成标准：

- 所有设置可读写并持久化。
- 上传背景刷新后仍可显示。
- 清除音频缓存不清除背景和设置。
- 导出包含 MQTT 密码时二次确认。

## 阶段 7：MQTT 远程控制

状态：已完成。

目标：

- 实现 [MQTT_PROTOCOL.md](MQTT_PROTOCOL.md)。
- 接入 MQTT.js。
- 使用本地 Docker Mosquitto 验证 WebSocket。

范围：

- `src/L1_Entry/adapters/mqttCommandEntry.ts`。
- `src/L1_Entry/settings/RemoteSettingsPanel.tsx`。
- `src/L2_Core/remoteControlCore.ts`。
- `src/L3_Business/settings/sanitizeSensitiveConfig.ts`。
- `src/L4_Atom/mqtt`。

完成标准：

- 可连接 `ws://localhost:9001`。
- `setVolume` 生效并返回 ACK。
- `requestState` 发布完整 state 且无密码。
- 断线和错误在 Settings 显示。

## 阶段 8：端到端验证与收口

状态：已完成。

目标：

- 执行 [TEST_PLAN.md](TEST_PLAN.md)。
- 修复移动端和桌面端 UI 问题。
- 确认文档与实现一致。

完成标准：

- `npm run test` 通过。
- `npm run build` 通过。
- 主要 Playwright 用例通过。
- MQTT WebSocket 用例通过。
- 文档无过期字段、路径和命令。

## 非阻塞开放项

这些项不阻塞本地 100% 实现，但会影响发布：

- 最终部署方式。
- 资源授权范围。
- Open-Meteo 发布用量和署名策略。
- 生产 MQTT Broker 地址和 `wss://` 证书。
