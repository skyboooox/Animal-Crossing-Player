# Animal-Crossing-Player 测试计划

## 文档定位

本文定义实现阶段的验证矩阵。每个阶段完成时至少跑对应测试。无法自动化的项需要手动验收并记录结果。

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
| 首批加载 | 当前 BGM + bell + 岛歌数据 |
| 缓存命中 | 第二次同配置显示 cached |
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
- 设置一级菜单。
- 设置二级面板。
- MQTT Connection。
- Audio Cache。
- Background。

要求：

- 无文本溢出。
- 无控件重叠。
- 主按钮可见。
- 图标按钮有可访问名称。
- Modal 焦点正确。
- 首页不显示播放器控制、MQTT 状态或错误状态。

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
