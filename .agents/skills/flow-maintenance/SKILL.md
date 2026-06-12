---
name: flow-maintenance
description: 用于项目进入维护期后的需求、问题、变更和回归治理；当用户提出新需求、修改已交付功能、处理 inbox、组装 CR、跑回归、跑烟雾测试、记录测试发现或维护长期项目账本时触发。
---

# Flow Maintenance

维护期 workflow：新需求、问题和测试发现先入 Inbox，经用户确认后组装 CR；TR 和 Regression Suite 管理回归证据。

## 触发与分流

用户说“新需求”“改一下”“处理 inbox”“启动 CR”“跑回归”“跑烟雾测试”“测一下”“启动 TR”时触发。

| 用户意图 | 工作流 |
| --- | --- |
| 新需求、修改已交付功能、中等规模 bug | Inbox -> CR |
| 跑回归、烟雾测试、探索性测试 | TR -> Inbox |
| 已确认 CR 需要实施 | CR -> Sprint -> Review |
| 单文件小修或治理维护 | 直接最小范围处理 |
| 分流不清 | 先让用户选择 |

不用于新项目启动、首次规划、重大架构决策；这些用 `$flow-kickoff`。模糊想法生成 goal prompt 用 `$flow-goal`。

## 账本目录

默认 `agent-workspace/`；已有其它目录则沿用。

```text
agent-workspace/
  inbox/INDEX.md
  changes/INDEX.md
  test-runs/INDEX.md
  dev-plan.md
  sprint-contract.md
  regression-suite.md
```

## Inbox -> CR

### A 记录 Inbox

- 中等规模问题先入 `inbox/`，不马上开 CR。
- 每条一文件；状态唯一写在 `inbox/INDEX.md`。
- 记录用户原话、摘要、根因猜测、影响范围、复现步骤。
- 发现同根因或同模块条目时，提示合并或关联，不自作主张。
- 输出只给编号、路径、聚类提示。
- 模板：`assets/templates/inbox-index.md`、`assets/templates/inbox-item.md`。

### B 组装 CR

- 用户明确说“启动 CR / 处理 inbox / 组装变更”后才进入。
- 先只读 `inbox/INDEX.md`，提出 2-3 个分组方案，等用户拍板。
- 每个 CR 一个文件：`changes/CR-NNN-slug.md`。
- CR 写背景、范围、非范围、可观测验收标准、影响范围、实施记录。
- CR 状态唯一写在 `changes/INDEX.md`。
- 模板：`assets/templates/cr-index.md`、`assets/templates/cr.md`。

### C 实施 CR

- 用户审过 CR 后再拆 Sprint。
- 使用 `dev-plan.md` 和 `sprint-contract.md`。
- 每个 Sprint 保持单一目标、文件范围、完成定义、验证要求。
- 改变契约时先更新契约索引或 Sprint 契约，再改代码。
- 验证通过后更新回归集。

## TR -> Inbox

- TR 是 Test Run；用户要求回归、烟雾或探索测试时先起草 TR。
- TR 写范围、场景、步骤、DoD；用户确认后执行。
- 测试 artifact 放本地日志目录或项目约定位置，不默认入 git。
- 每个 FAIL 场景至少产生一条 INBOX；测试过程不直接修代码。
- 模板：`assets/templates/test-run-index.md`、`assets/templates/test-run.md`。

## Regression Suite

- 只收可重复执行的行为断言。
- 不收文档体量、标题、frontmatter、锚词、提交计数等形态检查。
- 过期或被新 CR 反转的条目，在同一 CR 中退役或改写。
- flaky 条目先标记和记录，不立即删除。
- 模板：`assets/templates/regression-suite.md`。

## 文档分层

- `docs/intent/`：目标用户、场景、non-goals、roadmap。
- `docs/spec/`：当前行为契约、接口、配置、失败模式。
- `docs/qa-record/`：原始问答和决策记录。
- 先读 `INDEX.md`，再按需读章节。
- 模板：`assets/templates/intent-index.md`、`assets/templates/spec-index.md`。

## 输出

- Inbox：编号、路径、聚类提示、下一步。
- CR：分组方案或 CR 路径、范围、验收标准、需确认项。
- TR：TR 路径、场景数量、执行状态、FAIL 产生的 INBOX。
- Sprint：变更摘要、代码位置、验证结果、未覆盖风险。
- 不返回长日志、完整文件内容或无关 diff。
