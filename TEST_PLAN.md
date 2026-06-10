# Animal-Crossing-Player 测试计划

## 文档定位

本文定义实现阶段的验证矩阵。每个阶段完成时至少跑对应测试。无法自动化的项需要手动验收并记录结果。

## 当前验证结果

已通过：

- `npm run test`。
- `npm run lint`。
- `npm run build`。
- `npm run test:e2e`。
- `npm audit`。
- 本地 MQTT WebSocket 发布订阅：`ws://localhost:9001`。
- 侧边浏览器检查首页、设置弹窗启动台和 Remote 分区。

未关闭的发布项：

- 资源授权范围。
- 部署 HTTPS / `wss://` 策略。

## 单元测试

### 架构边界

| 模块 | 用例 |
| --- | --- |
| architecture | L4 不导入 L1 / L2 / L3 |
| architecture | L3 不导入 L1 / L2 |
| architecture | L3 避免横向导入同级 L3 |
| architecture | L1 只通过 L2 action 触发业务流程 |
| architecture | MQTT command 入口必须进入 L2 |
| architecture | Web Audio / CacheStorage / IndexedDB / MQTT.js 只在 L4 封装 |

### 业务逻辑

| 模块 | 用例 |
| --- | --- |
| manifest | 四个 BGM 版本可读取 |
| manifest | 每个已有天气数组长度为 24 |
| manifest | `Wild World` Rainy / Snowy 回退 Sunny |
| audio | 0..23 小时曲目选择 |
| audio | 23 点下一小时为 0 点 |
| audio | BGM 音量和岛歌音量分离 |
| townTune | NookNet `melody=` URL 解析 |
| townTune | 非 NookNet URL 拒绝 |
| townTune | 非 16 token 拒绝 |
| weather | Open-Meteo 雨 / 雪 / 晴映射 |
| weather | 定位拒绝回退 |
| time | 12h / 24h 格式 |
| time | 农历开关 |
| settings | 默认配置 |
| settings | 导出 / 导入 schema |
| settings | MQTT 密码导出检测 |
| mqtt | command payload 校验 |
| mqtt | ACK status 映射 |

## 集成测试

| 流程 | 验证 |
| --- | --- |
| 首次导览 | 四页顺序、跳过进入音频加载、加载完成后开始 |
| 导览操作区 | Skip 在页面左上角、Settings 在页面右上角且都不在弹窗内，Next / Start 在弹窗右下角 |
| 导览去重 | 导览打开时首页右上角设置入口不显示 |
| 语言热切换 | 切换 English / 简体中文立即更新当前导览文案 |
| 全局 i18n | 设置页切换 English / 简体中文立即更新首页、当前设置分区、导览和弹窗文案 |
| i18n 扩展性 | 每个语言有独立 `public/locales/<language>.json`，语言选项来自语言注册表 |
| BGM 双排 | 四个 BGM 版本在导览页显示为 2 x 2 网格 |
| 音频自动重试 | 音频加载页不显示 Retry 按钮，失败状态由页面自动重试 |
| 字体风格 | 首页、导览和设置使用 Alimama FangYuanTi VF，Nunito / Noto Sans SC 作为后备，时间数字启用等宽数字 |
| 首批加载 | 当前 BGM + bell + 岛歌数据 |
| 二次启动 | 首次导览完成后刷新或重新打开页面，先显示启动音频弹窗，加载完成后点击 Start 才播放 |
| 缓存命中 | 第二次同配置显示 cached |
| 设置弹窗 | 设置以弹窗显示，初始层是图标 + 描述启动台 |
| 设置层级 | 只有启动台和设置分区内容两个级别 |
| UI 组件复用 | 按钮、输入、开关、选择器、弹窗、卡片、单选、多选、表格等优先来自 `animal-island-ui`；图标使用本地 Fluent Emoji `AppIcon`；页面内标题使用本地 `GameHeading` |
| 设置保存 | 刷新后保持语言、音量、天气、背景 |
| 背景上传 | 上传后刷新仍显示 |
| 配置导出 | 含 MQTT 密码时二次确认 |
| 配置导入 | 含 MQTT 密码时二次确认 |
| MQTT 连接 | `ws://localhost:9001` 可连接 |
| MQTT 命令 | `setVolume` 生效并 ACK |
| MQTT 状态 | `requestState` 发布完整状态且无密码 |

## 浏览器验收

视口：

- Mobile：390 x 844。
- Tablet：768 x 1024。
- Desktop：1440 x 900。

页面：

- 导览弹窗。
- 首页。
- 设置弹窗启动台。
- 设置分区内容。
- MQTT Connection。
- Audio Cache。
- Background。

要求：

- 无文本溢出。
- 无控件重叠。
- 主按钮可见。
- 图标按钮有可访问名称。
- 图标来自本地 Fluent Emoji SVG，不混用抽象线框图标库；设置入口使用 `hammer-and-wrench`。
- Modal 焦点正确。
- Modal 内容区域在弹窗外形内居中，不贴左上角。
- 设置弹窗内 `Select` 下拉层保持紧凑，不撑满表单宽度，也不横向弹出到弹窗或页面外。
- 设置弹窗顶部 `Settings` / `Home` 按钮是轻量图标胶囊，不使用默认表单按钮视觉。
- 页面内标题不使用 `animal-island-ui` 的 `Title` 缎带视觉；标题语义层级正确，视觉贴近游戏内对话和设置 UI。
- 首页不显示播放器控制、MQTT 状态或错误状态。
- UI 文字使用 Alimama FangYuanTi VF，不回退到默认系统 sans-serif，中文和英文都保持圆润 UI 风格。

## MQTT 手动验证

启动 broker：

```sh
docker compose -f docker-compose.mqtt.yml up -d
```

浏览器配置：

```text
URL: ws://localhost:9001
Username: acplayer
Password: acplayer-dev
```

命令示例：

```json
{
  "version": 1,
  "id": "cmd-volume-1",
  "type": "setVolume",
  "target": "bgm",
  "value": 0.5,
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

预期：

- ACK status 为 `applied`。
- BGM 音量改变。
- state 不包含密码。

## 发布前检查

- `npm run test` 通过。
- `npm run build` 通过。
- 主要 Playwright 用例通过。
- 本地 MQTT WebSocket 用例通过。
- 资源授权范围确认。
- 部署 HTTPS / `wss://` 策略确认。
