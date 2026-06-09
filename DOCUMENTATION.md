# Animal-Crossing-Player 文档体系

## 文档定位

本文说明本仓库为什么拆成这些 Markdown、每个文件负责什么、哪些内容不能重复写。它是维护文档一致性的入口。

## 参考规范

本仓库文档体系参考以下公开实践：

- Atlassian PRD：PRD 应定义产品目的、功能、用户需要、范围和成功标准，作为团队单一事实来源。
- GitHub README：README 是仓库首页入口，适合放项目简介、导航、安装 / 运行入口和贡献指引；长文档应拆到独立文件。
- ADR：架构决策记录使用 Status、Context、Decision、Consequences 结构，保留“为什么这么选”。
- 技术设计文档：把架构、状态模型、协议、存储、测试拆开，避免 PRD 混入实现细节。

参考链接：

- <https://www.atlassian.com/software/confluence/templates/product-requirements>
- <https://www.atlassian.com/agile/requirements>
- <https://docs.github.com/github/creating-cloning-and-archiving-repositories/about-readmes>
- <https://adr.crastinating.pro/>
- <https://www.cavaro.io/templates/architecture-decision-record-adr>

## 文件职责

| 文件 | 类型 | 只负责 |
| --- | --- | --- |
| `README.md` | 入口 | 项目简介、文档导航、当前状态、本地 MQTT 快速入口 |
| `PROJECT.md` | PRD | 产品目标、范围、非目标、约束、验收标准 |
| `UI_UX.md` | UX Spec | 页面结构、导览、设置层级、状态、错误、可访问性 |
| `ARCHITECTURE.md` | Technical Design | 四层架构、依赖方向、启动流、边界、错误分类 |
| `STATE_MODEL.md` | Data Contract | 设置、运行态、导出配置、类型字段 |
| `AUDIO_ASSETS.md` | Asset Inventory | 现有资源事实、manifest 覆盖范围、资源缺口 |
| `AUDIO_ENGINE.md` | Domain Spec | BGM 选择、加载、播放、整点流程、音频失败恢复 |
| `TOWN_TUNE.md` | Domain Spec | NookNet URL、音符模型、岛歌预览 |
| `WEATHER_TIME.md` | Domain Spec | Open-Meteo、定位、手动天气、时间和农历 |
| `BROWSER_STORAGE.md` | Technical Design | CacheStorage、IndexedDB、OPFS、导入导出、清除边界 |
| `MQTT_PROTOCOL.md` | Protocol Spec | Topic、payload、ACK、state、error、本地 broker |
| `DEVELOPMENT.md` | Dev Guide | 依赖、脚本、本地 MQTT、验证命令 |
| `TEST_PLAN.md` | QA Plan | 单元、集成、浏览器、MQTT、发布前验证 |
| `DECISIONS.md` | ADR Log | 已接受的技术和产品架构决策 |
| `PLAN.md` | Implementation Plan | 阶段顺序、阶段目标、完成标准 |

## 维护规则

- 产品需求变更先改 `PROJECT.md`，再同步相关细节文档。
- UI 行为变更改 `UI_UX.md`。
- 字段名、默认值、导出结构变更改 `STATE_MODEL.md`。
- 代码模块边界和四层职责变更改 `ARCHITECTURE.md`。
- 音频选择、整点流程、缓存加载变更改 `AUDIO_ENGINE.md` 和 `BROWSER_STORAGE.md`。
- MQTT payload 或 topic 变更只以 `MQTT_PROTOCOL.md` 为准。
- 重要技术选择变更新增 ADR，不直接改旧 ADR 的历史含义。
- 阶段完成或顺序变化同步 `PLAN.md`。
- 新增命令、依赖、开发服务同步 `DEVELOPMENT.md`。
- 新增行为必须在 `TEST_PLAN.md` 有验证项。

## 冲突处理

优先级：

1. 用户最新明确要求。
2. `PROJECT.md` 产品边界。
3. `STATE_MODEL.md` 字段和默认值。
4. `MQTT_PROTOCOL.md` 协议字段。
5. `ARCHITECTURE.md` 四层模块边界。
6. `UI_UX.md` 展示细节。
7. `PLAN.md` 实施顺序。

如果文档冲突，先修文档再实现，避免代码按错误规格推进。

## 实现信心标准

认为“可以 100% 开始实现”必须满足：

- 每个用户需求在某个文档中有唯一归属。
- 每个文档职责不重叠或只做指向。
- 默认值明确。
- 数据结构明确。
- 四层架构目录、依赖方向和调试路径明确。
- 首次启动流程明确。
- 音频加载和回退明确。
- 天气来源明确。
- 岛歌支持范围明确。
- MQTT 协议明确。
- 本地 MQTT 可验证。
- 存储和明文密码风险明确。
- 测试矩阵覆盖主要流程。

当前文档体系满足这些条件。本地实现仍会受资源授权和最终部署策略影响，但这两个问题不阻塞本地功能实现。
