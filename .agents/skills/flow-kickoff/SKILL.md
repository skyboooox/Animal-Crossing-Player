---
name: flow-kickoff
description: 用于启动新项目、重大功能、架构决策、多 Sprint 实现或复杂 agent 任务；当需要项目 intake、范围定义、架构规划、Sprint 契约、角色拆分、验收标准和实施计划时触发。
---

# Flow Kickoff

把模糊目标收敛为架构方向、契约索引、Sprint 契约和首个可实施 Sprint。首版交付后转 `$flow-maintenance`。

## 触发

- 新项目、模板派生仓库、重大功能、长期任务、多 Sprint 实现。
- 需求影响架构、范围、技术栈、交付、数据、安全或验收。
- 跨模块、跨技术栈、长期约束或多 Agent 任务。
- 小 bug、typo、文案、单文件局部修改和不改对外行为的治理维护不触发。

## 前置门禁

- 复杂任务先用 `$flow-research`；联网前读 `docs/websearch/index.md`。
- 实现前必须有 Sprint 契约：`assets/templates/sprint-contract.md`。
- 默认不改产品代码；只产出或更新启动摘要、契约索引、Sprint 契约、评估计划、Agent 边界和工具清单。
- 进入实现后分派 `implementer.toml` 或 `fast-editor.toml`。
- 会改变需求、架构、公开 API、配置、数据、权限、工作流或验收时，先更新契约索引：`assets/templates/contract-index.md`。
- 多 Agent、工具、权限或长期任务补充：
  - `assets/templates/eval-plan.md`
  - `assets/templates/agent-boundary-matrix.md`
  - `assets/templates/tool-inventory.md`
- 工作流分流不清时先问用户。

## 技术栈偏好

- 新项目默认 JavaScript/TypeScript；维护收益明显时优先 TypeScript。
- 运行时、包管理、测试、构建默认 Bun 或 Node.js。
- Python 第二选择；其他语言需平台、性能、安全、原生集成或用户要求。
- 已有项目延续现有主语言和工具链，不为套偏好重写稳定代码。

## Lead / Worker

- `architect.toml` 是唯一调度者：理解目标、主动评估派生、分派、合成、复核、交付。
- SubAgent 只返回摘要，不互相协调。
- 复杂任务默认先判断是否可派生；可分离、边界清晰、复核成本可控时主动派生。
- 规划、联网研究、静态审查、回归验证、低风险局部编辑优先派生。
- 多 Agent 用于高价值、可并行、信息量超过单上下文或工具面复杂的任务。
- 强耦合编码、共享完整上下文、文件所有权重叠或实时协同成本高时，使用单 agent + Sprint 契约。
- agent 配置变化影响协作边界时，同步 Sprint 契约、Agent 边界矩阵或项目规则。

## 阶段

| 阶段 | 执行者 | 输出 | 失败回路 |
| --- | --- | --- | --- |
| 0 Intake | `architect.toml`，必要时 `planner.toml` | `goal`、`scope`、`non_goals`、`constraints`、`acceptance_criteria` | 范围不清则问用户 |
| 1 Research | `researcher.toml` 或 `$flow-research` | `facts`、`sources`、`freshness_risk`、`open_questions`，更新 `docs/websearch/index.md` | 来源冲突或事实不足则回 Intake |
| 2 Architecture | `architect.toml`，必要时 `planner.toml` | 架构方向、领域边界、依赖方向、关键契约、风险 | 长期边界不清则确认 |
| 3 Decompose | `planner.toml` | Sprint 列表、`current_sprint`、`contract_id`、依赖、`owned_files`、风险图 | 无法拆分则回 Architecture/Research |
| 4 Assign | `architect.toml` | agent 路由、文件所有权、停止条件、摘要格式 | 所有权冲突则回 Decompose |
| 5 Execute | `implementer.toml` 或 `fast-editor.toml` | 聚焦变更、代码位置、局部验证、风险 | 阻塞则回 Decompose/Research |
| 6 Synthesize | `architect.toml` | 合并结果、冲突处理、剩余缺口 | 缺口定向重派 |
| 7 Evaluate | `evaluator.toml` | `eval_cases`、`verification`、`evidence`、`failure_reproduction`、`risks` | 失败则回 Execute |
| 8 Review | `reviewer.toml` 或 `$flow-review` | P0-P3 findings、test gaps、regression risks | P0/P1 回 Execute |
| 9 Integrate | `architect.toml` | 最终摘要、验证结果、未覆盖风险、下一步 | 关键验证缺失则回 Evaluate |

## Intake 必填

- 目标、用户、核心场景、交付物。
- 第一版必须有、明确不要做、后续再做。
- 环境、数据、集成、安全、验收。
- 可用 `assets/templates/project-kickoff.md`。

## 架构规则

- 新项目、重大重构或缺少一致架构时默认四层；成熟一致架构不机械搬迁。
- `L1_Entry`：外部输入、解析、校验、转发。
- `L2_Core`：流程、状态机、权限、重试、错误处理、跨领域决策。
- `L3_Business`：业务能力单元，组合 L4，保持被动。
- `L4_Atom`：小而稳定的底层能力，只依赖标准库、平台 API 或广泛适用第三方库。
- 依赖方向：L1 -> L2；L2 -> L3/L4；L3 -> L4；避免 L3 横向调用；L4 不调用项目层级。
- 架构决策可用 `assets/templates/architecture-decision-record.md`。

## 契约追踪

- 目标是快速定位实现，不追求文档和代码全文 1:1。
- 契约索引字段：`contract_id`、`contract`、`source_doc`、`code_locations`、`tests_or_verification`、`owner_agent`、`status`。
- 文档只写约束、定位入口、验证证据；不复制实现细节。
- `code_locations` 写最小入口：文件、模块、导出符号或测试名。
- Implementer 返回代码位置和验证证据；Evaluator 验证契约、实现、测试一致。
- 删除或废弃契约时，同步处理代码、测试、配置和文档引用。

## 工具与展示

- 工具面过大时先维护工具清单，只加载当前 Sprint 必需工具。
- 工具清单字段：`tool_name`、`purpose`、`when_to_use`、`required_inputs`、`safe_outputs`、`token_risk`、`permission_risk`、`verification`。
- Agent 边界字段：`agent`、`allowed_tools`、`allowed_paths`、`network_scope`、`write_scope`、`escalation_required`、`stop_conditions`。
- 面向人类的富文本、多媒体、图表、筛选、状态色或交互可直接创建 HTML artifact。
- HTML 不作唯一权威源；关键结论应指向源文件、`contract_id`、测试命令、证据路径或结构化数据。
- 外部资源、多媒体、脚本或网络加载要写清来源、许可、离线可用性和安全风险。

## Sprint 规则

- 每个 Sprint 只处理一个目标；不混合功能、重构、格式化、清理。
- 先做最大不确定性降低项。
- 每个 Sprint 必须有完成定义、验证步骤、失败阈值和回滚方式。
- 若已有 `PLAN.md`，只更新对应状态；不默认创建、移动、归档或重写。
- 评估计划覆盖 happy path、edge cases、failure paths、regression risks、grading logic、commands/manual checks、evidence required。
- 验收只看可观测行为；标题、frontmatter、锚词、文件大小只作 lint 或维护检查。

## Agent 路由

- 模糊需求、范围、风险、Sprint：`planner.toml`。
- 架构、调度、分派、合成、最终判断：`architect.toml`。
- 当前事实、官方资料、依赖、价格、法规、外部服务：`researcher.toml` 或 `$flow-research`。
- 低风险短上下文局部编辑：`fast-editor.toml`。
- 已定义 Sprint 实施：`implementer.toml`。
- 运行验证、验收、失败路径、回归：`evaluator.toml`。
- Git diff、PR、提交前风险：`reviewer.toml` 或 `$flow-review`。

## 共享状态

`goal`、`scope`、`non_goals`、`constraints`、`acceptance_criteria`、`contract_index`、`current_sprint`、`owned_files`、`risks`、`verification`、`eval_plan`、`agent_boundaries`、`tool_inventory`、`open_questions`。

## 并行与预算

- read-only 探索、研究、审查可以并行；写文件默认不并行。
- 多个 implementer 必须先分配文件所有权和合并顺序。
- `evaluator.toml` 在 implementer 后运行；`reviewer.toml` 在实现后或提交前运行。
- 默认最多 4 个并行 SubAgent；超过必须说明收益和风险。
- 每个 SubAgent 必须有停止条件；失败一次后先收敛问题，不无限重试。

## 确认门禁

需求范围不清、架构边界影响长期维护、新增生产依赖、扩大权限/网络/数据面、修改 public API/migration/auth/billing/deploy 时先确认。

## SubAgent 摘要

返回：`agent`、`scope`、`contract_id`、`files_read`、`files_touched`、`findings`、`evidence`、`verification`、`risks`、`next_action`。

## 输出

项目一句话定义、目标与非目标、第一版范围、约束与风险、架构方向、契约索引、Sprint 列表、首个 Sprint 契约、必要验证、仍需确认的问题。

## 停止条件

- 首个 Sprint 已可实施。
- 核心约束缺失，继续规划会制造假确定性。
- 需要联网事实但尚未完成前置研究。
