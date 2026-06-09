# Animal-Crossing-Player 架构决策记录

## 文档定位

本文是轻量 ADR 日志。每条只记录一个重要决策、背景和后果。已接受的决策不回写历史；如果未来改变，新增一条 Supersedes 记录。

## ADR-001 React + Vite

Status: Accepted

Context:

- 用户明确要求新项目是 React + Vite。
- 旧项目只作为功能参考，不沿用架构。

Decision:

- 使用 React + Vite 作为新实现基线。

Consequences:

- 需要重建入口、状态管理、组件和测试配置。
- 旧项目 Solid 代码不直接迁移。

## ADR-002 使用 animal-island-ui

Status: Accepted

Context:

- 用户要求使用 `animal-island-ui` 完全重构 UI。
- 该库是 React 组件库，当前本地依赖版本为 `0.9.5`。

Decision:

- UI 以 `animal-island-ui` 为主。
- 使用时导入 `animal-island-ui/style`。

Consequences:

- 自定义 CSS 只承担布局、响应式和少量缺失组件。
- 不继续维护旧项目 `.card`、`.btn` 等样式系统。

## ADR-003 首页极简

Status: Accepted

Context:

- 用户明确要求首页只显示时间与天气。
- 日期和农历后来被纳入首页显示范围。

Decision:

- 首页只显示时间、日期、可选农历、天气和背景。
- 播放器控制、MQTT 状态、错误、BGM 版本和岛歌不在首页显示。

Consequences:

- 阻塞错误必须在导览或 Modal 中处理。
- 设置页承担完整控制面。

## ADR-004 首次进入使用导览

Status: Accepted

Context:

- 用户最初要求设置浮窗，随后修正为新的导览。
- 音频必须在用户完成选择后再加载。

Decision:

- 首次进入显示四页导览：语言、BGM 版本、岛歌导入、音频加载。
- 跳过使用默认配置并进入音频加载页。

Consequences:

- 导览状态成为启动流程的一部分。
- 音频加载进度是阻塞式 UX。

## ADR-005 音频缓存使用 CacheStorage

Status: Accepted

Context:

- 用户希望利用浏览器特性缓存音频，节省服务器带宽并加快第二次加载。
- 音频资源是可通过 URL 请求的 mp3。

Decision:

- 音频响应优先使用 CacheStorage 缓存。
- StorageManager 用于估算配额和请求持久化。
- OPFS 只作为未来文件级管理增强。

Consequences:

- 第二次同配置启动可减少网络下载。
- 缓存被清理时必须能重新下载。

## ADR-006 上传背景本地保存

Status: Accepted

Context:

- 用户要求背景可以上传，并存储在浏览器内。

Decision:

- 用户上传背景默认存入 IndexedDB Blob。
- OPFS 作为未来增强。

Consequences:

- 不需要服务器上传接口。
- 清除音频缓存不能删除用户上传背景。

## ADR-007 MQTT 只支持 WebSocket

Status: Accepted

Context:

- 浏览器不能直接连接原生 TCP MQTT。
- 用户要求通过浏览器接入 MQTT 服务器远程控制。

Decision:

- 浏览器端只接受 `ws://` 或 `wss://`。
- 本地开发使用 Docker Mosquitto 暴露 `9001` WebSocket。

Consequences:

- `mqtt://` 和 `mqtts://` 在 UI 中必须明确拒绝。
- HTTPS 部署需要 `wss://` broker。

## ADR-008 天气使用 Open-Meteo

Status: Accepted

Context:

- 用户要求天气可自动定位或手动设置。
- 项目没有既定天气 API。
- Open-Meteo 不需要 API key，适合本地开发和浏览器端原型。

Decision:

- 自动天气使用浏览器 Geolocation + Open-Meteo Forecast API。

Consequences:

- 发布前需要确认 Open-Meteo 使用条款、署名和流量限制。
- API 失败时回退 lastAuto 或 Sunny。

## ADR-009 农历使用 lunar-javascript

Status: Accepted

Context:

- 用户要求日期增加农历显示并提供开关。
- 用户同意引入库。

Decision:

- 使用 `lunar-javascript`，不自写农历转换算法。

Consequences:

- 需要验证中文和英文显示文案。
- 首页只展示简短农历日期。

## ADR-010 使用四层架构标准

Status: Accepted

Context:

- 当前仓库级工作指令要求新项目和重大重构默认采用集中编排、底层独立的四层结构。
- Animal-Crossing-Player 是完全重构项目，需要避免 UI、音频、MQTT、缓存和天气流程互相缠绕。
- 之前文档使用 `app / features / domain / services / ui` 分层，和仓库标准不一致。

Decision:

- 新实现采用 `L1_Entry`、`L2_Core`、`L3_Business`、`L4_Atom` 四层架构。
- L1 接收 UI / MQTT / 浏览器事件并转发 L2。
- L2 拥有流程、状态机、重试、错误处理和跨领域编排。
- L3 实现音频、岛歌、天气、时间、设置、背景等领域能力。
- L4 封装 Web Audio、CacheStorage、IndexedDB、OPFS、MQTT.js、Open-Meteo、Geolocation、lunar-javascript 和 UI 原子组件。

Consequences:

- `ARCHITECTURE.md` 和 `PLAN.md` 的实现路径以四层目录为准。
- 调试默认从 L2 开始，再下钻到 L3 或 L4。
- 组件不得直接调用平台副作用；MQTT 命令不得绕过 L2。
- L3 避免横向调用同级 L3，由 L2 负责组合。
