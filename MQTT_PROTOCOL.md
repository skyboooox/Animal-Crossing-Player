# Animal-Crossing-Player MQTT 远控协议

## 文档定位

本文定义浏览器端 MQTT 远程控制协议，包括连接方式、topic 命名、命令 payload、状态发布、错误反馈和本地存储规则。

本协议服务于浏览器应用，不定义 MQTT Broker 部署方式。浏览器只能通过 MQTT over WebSocket 连接 Broker。

## 连接约束

- 只接受 `ws://` 或 `wss://` URL。
- HTTPS 页面应使用 `wss://`。
- 不支持 `mqtt://` 或 `mqtts://` 原生 TCP 地址。
- MQTT 用户名和密码只有在用户启用 `saveCredentials` 并确认明文存储提示后，才允许保存在浏览器本地存储中。
- 密码不得出现在日志、状态消息、错误详情、导出状态或 UI 明文区域中。

## 本地开发 Broker

本仓库提供本地 Mosquitto Docker Compose 配置，供浏览器 MQTT over WebSocket 联调使用。

配置文件：

```text
docker-compose.mqtt.yml
docker/mqtt/mosquitto.conf
docker/mqtt/passwords
```

开发连接信息：

| 项 | 值 |
| --- | --- |
| WebSocket URL | `ws://localhost:9001` |
| TCP URL | `mqtt://localhost:1883` |
| Username | `acplayer` |
| Password | `acplayer-dev` |

说明：

- 浏览器应用只能使用 `ws://localhost:9001`。
- `mqtt://localhost:1883` 仅用于命令行客户端验证。
- `docker/mqtt/passwords` 是 Mosquitto 加密后的密码文件；应用设置中保存 MQTT 密码时仍必须显示明文存储确认。
- 本地开发账号不能用于生产部署。

启动：

```sh
docker compose -f docker-compose.mqtt.yml up -d
```

停止：

```sh
docker compose -f docker-compose.mqtt.yml down
```

## 基础配置

用户可配置：

- `enabled`：是否启用远程控制。
- `url`：WebSocket Broker URL。
- `clientId`：当前播放器客户端 ID。
- `username`：可选用户名。
- `password`：可选密码。
- `saveCredentials`：是否保存用户名密码，默认 `false`。
- `baseTopic`：默认 `ac-player/v1/{clientId}`。
- `qos`：默认 `0`，可选 `0` 或 `1`。
- `retainState`：默认 `true`，状态消息建议 retain。
- `retainCommand`：默认 `false`，命令消息不得 retain。

`clientId` 应稳定保存。首次生成建议格式：

```text
acp-{8 random lowercase hex chars}
```

## Topic 设计

默认 topic：

```text
ac-player/v1/{clientId}/command
ac-player/v1/{clientId}/ack
ac-player/v1/{clientId}/state
ac-player/v1/{clientId}/event
ac-player/v1/{clientId}/error
```

用途：

- `command`：远程端发布命令，播放器订阅。
- `ack`：播放器发布命令处理结果。
- `state`：播放器发布当前完整状态。
- `event`：播放器发布非阻塞事件。
- `error`：播放器发布错误摘要。

保留一个广播发现 topic：

```text
ac-player/v1/discovery
```

播放器可以向 `discovery` 发布在线摘要，但不从该 topic 接收控制命令。

## 通用消息格式

所有 payload 使用 JSON。

通用字段：

```json
{
  "version": 1,
  "id": "01JABCDEF1234567890",
  "type": "setVolume",
  "sentAt": "2026-06-09T12:00:00.000Z",
  "source": "remote-panel"
}
```

字段说明：

- `version`：协议版本，目前固定为 `1`。
- `id`：命令或消息 ID。远程命令必须提供，用于 ACK 对应。
- `type`：消息类型。
- `sentAt`：发送时间，ISO 8601 字符串。
- `source`：发送方标识，可选。

未知字段应忽略。未知 `type` 应拒绝并返回 ACK。

## Command 消息

远程命令发布到：

```text
ac-player/v1/{clientId}/command
```

### start

开始播放。若音频尚未加载，应进入必要加载流程。

```json
{
  "version": 1,
  "id": "cmd-start-1",
  "type": "start",
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

### pause

暂停播放。

```json
{
  "version": 1,
  "id": "cmd-pause-1",
  "type": "pause",
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

### resume

恢复播放。

```json
{
  "version": 1,
  "id": "cmd-resume-1",
  "type": "resume",
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

### setVolume

设置音量。`target` 只能是 `bgm` 或 `townTune`。`value` 范围为 `0` 到 `1`。

```json
{
  "version": 1,
  "id": "cmd-volume-1",
  "type": "setVolume",
  "target": "bgm",
  "value": 0.72,
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

### setBgmVersion

切换 BGM 版本。`value` 必须匹配本地音频目录中的版本名。

```json
{
  "version": 1,
  "id": "cmd-version-1",
  "type": "setBgmVersion",
  "value": "New Horizons (Switch 2021)",
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

### setWeather

设置天气。`mode` 为 `auto` 时应用自动定位；`manual` 时 `weather` 必填。

```json
{
  "version": 1,
  "id": "cmd-weather-1",
  "type": "setWeather",
  "mode": "manual",
  "weather": "Rainy",
  "locationLabel": "Manual",
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

允许的 `weather`：

```text
Sunny
Rainy
Snowy
```

### refreshWeather

刷新自动天气。手动天气模式下可返回 `ignored`。

```json
{
  "version": 1,
  "id": "cmd-refresh-weather-1",
  "type": "refreshWeather",
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

### setTownTune

设置岛歌。只支持 NookNet URL。

```json
{
  "version": 1,
  "id": "cmd-town-tune-1",
  "type": "setTownTune",
  "url": "https://nooknet.net/tunes?melody=g-a-b-c-d-e-f-G-A-B-C-D-E-z-z-z&title=Island",
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

### previewTownTune

预览当前岛歌。没有岛歌时返回 `ignored`。

```json
{
  "version": 1,
  "id": "cmd-preview-tune-1",
  "type": "previewTownTune",
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

### triggerHourlyFlow

触发整点流程。

```json
{
  "version": 1,
  "id": "cmd-hourly-1",
  "type": "triggerHourlyFlow",
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

### requestState

请求播放器发布一次完整状态。

```json
{
  "version": 1,
  "id": "cmd-state-1",
  "type": "requestState",
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

## ACK 消息

播放器对每条命令发布 ACK 到：

```text
ac-player/v1/{clientId}/ack
```

ACK 格式：

```json
{
  "version": 1,
  "id": "ack-cmd-volume-1",
  "commandId": "cmd-volume-1",
  "type": "ack",
  "status": "applied",
  "message": "BGM volume updated.",
  "sentAt": "2026-06-09T12:00:00.000Z"
}
```

`status` 可选：

- `accepted`：已接收并开始执行。
- `applied`：已生效。
- `ignored`：当前状态下不适用。
- `rejected`：参数无效或权限不足。
- `failed`：执行出错。

## State 消息

播放器发布完整状态到：

```text
ac-player/v1/{clientId}/state
```

建议 retained。

```json
{
  "version": 1,
  "id": "state-1",
  "type": "state",
  "sentAt": "2026-06-09T12:00:00.000Z",
  "clientId": "acp-1a2b3c4d",
  "app": {
    "ready": true,
    "playing": true,
    "audioBlocked": false
  },
  "audio": {
    "bgmVersion": "New Horizons (Switch 2021)",
    "bgmVolume": 0.72,
    "townTuneVolume": 0.8,
    "townTuneConfigured": true,
    "loading": false,
    "cacheEnabled": true
  },
  "weather": {
    "mode": "auto",
    "value": "Sunny",
    "locationLabel": "Shanghai",
    "temperature": 28
  },
  "time": {
    "hourCycle": "24h",
    "lunarEnabled": true
  },
  "lastError": null
}
```

状态消息不得包含：

- MQTT 密码。
- 完整带凭据的 URL。
- NookNet URL 中不需要公开的原始查询之外的敏感数据。

## Event 消息

非阻塞事件发布到：

```text
ac-player/v1/{clientId}/event
```

示例：

```json
{
  "version": 1,
  "id": "event-cache-1",
  "type": "event",
  "event": "nextHourPreloaded",
  "sentAt": "2026-06-09T12:05:00.000Z",
  "data": {
    "hour": 13,
    "bgmVersion": "New Horizons (Switch 2021)"
  }
}
```

建议事件：

- `started`
- `paused`
- `resumed`
- `hourlyFlowStarted`
- `hourlyFlowCompleted`
- `nextHourPreloaded`
- `cacheProgress`
- `cacheFailed`
- `weatherUpdated`

## Error 消息

错误摘要发布到：

```text
ac-player/v1/{clientId}/error
```

```json
{
  "version": 1,
  "id": "error-1",
  "type": "error",
  "sentAt": "2026-06-09T12:00:00.000Z",
  "code": "INVALID_TOWN_TUNE_URL",
  "message": "Town tune must be a valid NookNet URL.",
  "recoverable": true
}
```

错误信息必须脱敏。

## 本地存储

浏览器本地始终保存：

- `enabled`
- `url`
- `clientId`
- `baseTopic`
- `qos`
- `retainState`
- `saveCredentials`

仅当 `saveCredentials` 为 `true` 且用户确认明文存储提示后，浏览器本地保存：

- `username`
- `password`

本地存储要求：

- 设置页必须提供清除 MQTT 配置能力。
- `saveCredentials` 默认关闭。
- 用户开启 `saveCredentials` 时，必须弹窗提示用户名和密码将会明文存储在浏览器内。
- 用户取消提示时，不得保存用户名和密码。
- 导出设置时，如果配置包含 MQTT 密码，必须弹窗提示密码将会明文存储在配置文件内。
- 导入设置时，如果配置文件包含 MQTT 密码，必须弹窗提示导入后密码会按配置明文存储在浏览器内。
- 日志和状态消息永远不包含密码。

## 参数校验

播放器接收命令后必须校验：

- JSON 是否可解析。
- `version` 是否支持。
- `id` 是否存在。
- `type` 是否支持。
- 数值范围是否有效。
- URL 协议是否允许。
- BGM 版本是否存在。
- NookNet URL 是否可解析。

校验失败返回 `rejected` ACK。

## 兼容性策略

未来协议扩展时：

- 增加字段必须保持向后兼容。
- 删除字段必须提升 `version`。
- 未知字段应忽略。
- 未知命令类型应返回 `rejected`。
