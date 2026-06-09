# Animal-Crossing-Player 四层架构说明

## 文档定位

本文定义代码架构、模块边界、依赖方向和运行数据流。产品目标看 [PROJECT.md](PROJECT.md)，数据结构看 [STATE_MODEL.md](STATE_MODEL.md)，实施顺序看 [PLAN.md](PLAN.md)。

本项目采用仓库级工作指令中的四层架构标准：集中编排、底层独立、浅调用链。

## 架构目标

- React + Vite 本地开发简单、可测试、可迭代。
- 用户入口、业务编排、业务能力和平台原子能力边界清晰。
- 音频、导览、设置、天气、缓存、MQTT 的流程控制集中在 L2。
- L3 只做领域能力，不藏跨领域状态机。
- L4 只封装平台 API、第三方库和可复用原子函数。
- 所有 UI 事件和 MQTT 命令都进入同一套 L2 Core action。

## 推荐目录

```text
src/
  L1_Entry/
    main.tsx
    App.tsx
    providers.tsx
    routes.tsx
    pages/
      HomePage.tsx
      SettingsPage.tsx
    onboarding/
      OnboardingModal.tsx
      LanguageStep.tsx
      BgmVersionStep.tsx
      TownTuneStep.tsx
      AudioLoadingStep.tsx
    settings/
      SettingsShell.tsx
      AudioSettingsPanel.tsx
      IslandSettingsPanel.tsx
      RemoteSettingsPanel.tsx
      AppSettingsPanel.tsx
    adapters/
      mqttCommandEntry.ts
      browserEventEntry.ts

  L2_Core/
    appState.ts
    appActions.ts
    startupCore.ts
    onboardingCore.ts
    audioCore.ts
    settingsCore.ts
    weatherCore.ts
    remoteControlCore.ts
    backgroundCore.ts
    errorCore.ts

  L3_Business/
    audio/
      selectTrack.ts
      planAudioLoad.ts
      hourlyFlow.ts
    townTune/
      parseNookNetUrl.ts
      buildTownTuneSequence.ts
    weather/
      mapOpenMeteoWeather.ts
      resolveWeatherSnapshot.ts
    time/
      formatClock.ts
      formatLunarDate.ts
    settings/
      defaults.ts
      importExportConfig.ts
      sanitizeSensitiveConfig.ts
    background/
      resolveBackground.ts

  L4_Atom/
    assetManifest/
      loadAudioManifest.ts
    audio/
      webAudio.ts
      audioBufferLoader.ts
    storage/
      localJsonStore.ts
      indexedDbStore.ts
      cacheStorageStore.ts
      opfsStore.ts
      storageEstimate.ts
    mqtt/
      mqttClient.ts
      mqttJson.ts
    weatherApi/
      geolocation.ts
      openMeteoClient.ts
    date/
      lunar.ts
    ui/
      animalIsland.ts
      ProgressBar.tsx
      ConfirmModal.tsx
      NotePreview.tsx
    utils/
      ids.ts
      result.ts
      url.ts

  test/
    fixtures/
    helpers/
```

## 四层职责

### L1 Entry

接收外部输入并展示输出。

包括：

- React 入口、路由、Provider。
- 页面、导览、设置面板。
- UI 事件适配。
- MQTT 收到消息后的入口适配。
- 浏览器事件适配，例如 visibility change、online/offline。

规则：

- L1 可以调用 L2。
- L1 可以使用 L4 UI 原子组件。
- L1 不直接调用 Web Audio、CacheStorage、MQTT publish、Open-Meteo 或 IndexedDB。
- L1 不做跨领域业务决策。

### L2 Core

拥有流程和状态机。

包括：

- 启动流程。
- 导览流程。
- 首批音频加载流程。
- 播放和整点流程编排。
- 设置保存、导入、导出、清除流程。
- 天气刷新流程。
- MQTT 命令处理流程。
- 错误分类和恢复流程。

规则：

- L2 可以调用 L3 和 L4。
- L2 是唯一能协调多个领域的层。
- 状态更新、重试、错误处理、跨领域分支放在 L2。
- UI 事件和 MQTT 命令都转化为 L2 action。

### L3 Business

实现领域能力单元。

包括：

- BGM 选择。
- 音频加载计划。
- 整点流程计划。
- NookNet URL 解析。
- 天气映射。
- 时间和农历格式化。
- 设置默认值、导入导出校验、敏感字段清洗。
- 背景解析。

规则：

- L3 可以调用 L4。
- L3 不调用同级 L3，除非 L2 明确组合。
- L3 不拥有全局 app state。
- L3 不直接弹窗、不发布 MQTT、不写浏览器持久化。

### L4 Atom

提供原子能力。

包括：

- `animal-island-ui` 封装。
- Web Audio 原子操作。
- CacheStorage / IndexedDB / OPFS / localStorage 包装。
- MQTT.js 连接、订阅、发布原子操作。
- Open-Meteo HTTP 请求。
- Geolocation。
- lunar-javascript 包装。
- URL、ID、Result 等纯工具。

规则：

- L4 不导入 L1 / L2 / L3。
- L4 不知道产品流程。
- L4 函数功能单一，方便 mock 和替换。

## 依赖方向

```text
L1_Entry -> L2_Core
L1_Entry -> L4_Atom/ui
L2_Core -> L3_Business
L2_Core -> L4_Atom
L3_Business -> L4_Atom
L4_Atom -> platform / third-party
```

禁止：

- L4 调用项目上层。
- L3 横向调用 L3。
- L1 直接调用平台副作用。
- MQTT command 直接修改 UI state。
- 音频播放状态机藏在 React 组件里。
- 设置导出、密码确认、音频加载这类流程藏进 L3 或 L4。

## 全局状态

全局状态放在 L2：

- `settings`：可持久化配置。
- `runtime`：当前会话状态。
- `errors`：最近错误和恢复信息。

L1 订阅状态并触发 action；L2 决定状态如何变化。

## 统一动作流

```text
UI event / MQTT message / browser event
  -> L1 Entry adapter
  -> L2 Core action
  -> L3 Business calculation
  -> L4 Atom side effect
  -> L2 Core state update
  -> L1 render / MQTT ACK / state publish
```

## 启动流程

```text
L1 main.tsx
  -> L2 startupCore.bootstrap()
    -> L4 load persisted settings
    -> L4 load audio manifest
    -> L3 resolve defaults
    -> L2 decide onboarding or ready state
  -> L1 render onboarding or home
```

导览 `Skip`：

```text
L1 Skip button
  -> L2 onboardingCore.skipWithDefaults()
    -> L3 settings defaults
    -> L2 go to audio loading step
    -> L2 audioCore.loadRequiredAudio()
```

## 音频流程

```text
L1 Start button
  -> L2 audioCore.start()
    -> L3 select current track
    -> L4 cache lookup / fetch / decode
    -> L4 Web Audio play
    -> L2 preload next hour
```

整点流程：

```text
timer / MQTT trigger
  -> L2 audioCore.runHourlyFlow()
    -> L3 build hourly flow plan
    -> L4 Web Audio fade / play sequence
    -> L2 update current track and preload following hour
```

## MQTT 流程

```text
L4 mqttClient receives raw message
  -> L1 mqttCommandEntry
  -> L2 remoteControlCore.handleCommand()
    -> L3 validate command payload
    -> L2 dispatch local action
    -> L4 mqttClient publish ACK/state
```

MQTT 不能绕过 L2，也不能发布密码。

## 错误处理

错误分三类：

- 阻塞错误：首批音频加载失败、浏览器音频授权失败。
- 可恢复错误：天气失败、定位失败、后台缓存失败、MQTT 断线。
- 输入错误：NookNet URL 无效、MQTT URL 协议错误、导入配置格式错误。

错误分类和恢复动作在 L2。L1 只负责展示；L3 / L4 只返回错误结果。

## 调试路径

Bug 默认从 L2 往下查：

1. 先查 L2：编排、分支、状态、错误处理。
2. 流程正确后，查产生错误结果的 L3 或 L4。
3. 编排 Bug 在 L2 修；实现 Bug 在对应 L3 或 L4 修。

## 测试边界

- L3 使用单元测试。
- L4 使用 mock 平台 API 或小型集成测试。
- L2 使用流程测试和状态机测试。
- L1 使用 React Testing Library 和 Playwright。
- MQTT 使用本地 Docker Mosquitto。

详细测试矩阵见 [TEST_PLAN.md](TEST_PLAN.md)。
