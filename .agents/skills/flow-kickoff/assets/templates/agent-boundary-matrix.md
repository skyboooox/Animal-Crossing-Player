# Agent 边界矩阵

用于多 Agent、联网、写文件、权限扩大或长期任务。目标是限制 blast radius，避免子 Agent 扩权或越界。

| Agent | 任务 | 允许工具 | 允许路径 | 网络范围 | 写入范围 | 需要升级确认 | 停止条件 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `architect` | `<调度/决策>` | `<只读/搜索/委派>` | `<路径>` | `<none/limited/full>` | `<none>` | `<条件>` | `<条件>` |
| `implementer` | `<实现 Sprint>` | `<shell/apply_patch/test>` | `<授权文件>` | `<none/limited>` | `<授权文件>` | `<public API/security/migration/deploy>` | `<失败阈值>` |

## 维护规则

- 默认最小权限。
- 写入 Agent 必须有文件所有权。
- 联网、凭据、部署、迁移、删除、重置、权限扩大必须写升级条件。
- 子 Agent 不直接互相协调，冲突回到 architect。
