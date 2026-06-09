# Animal-Crossing-Player 岛歌设计

## 文档定位

本文定义 NookNet 岛歌 URL 支持范围、解析规则、音符模型和预览播放。产品要求只支持 NookNet URL，不提供手动编辑器。

## 支持范围

支持的 URL：

```text
https://nooknet.net/tunes?melody=D-D-B-E-D-s-D-D-B-E-D-B-C-B-A-G&title=Oto%20Melody
http://nooknet.net/tunes?melody=d-e-z-d-d-e-z-d-A-G-f-e-A-G-f-e&title=Example
```

要求：

- Host 必须是 `nooknet.net` 或 `www.nooknet.net`。
- Path 必须是 `/tunes`。
- 必须包含 `melody` 查询参数。
- `title` 查询参数可选。
- `melody` 必须包含 16 个以 `-` 分隔的 token。

不支持：

- 非 NookNet URL。
- 没有 `melody` 参数的 NookNet 页面。
- 手动输入 16 个音符。
- 从 NookNet 页面抓取或绕过 CORS 解析隐藏数据。

如果用户粘贴 `t=` 形式但页面没有 `melody` 参数，显示错误：`Please paste a NookNet URL that includes melody=`.

## Token

允许 token：

- 小写 `a` 到 `g`：低音。
- 大写 `A` 到 `G`：高音。
- `s`：延音。
- `z`：休止。

解析结果：

```ts
interface TownTuneNote {
  token: string;
  kind: 'note' | 'sustain' | 'rest';
  frequency: number | null;
}
```

`s` 延续上一个有效音符；如果出现在开头或前面只有休止，则按休止处理。`z` 静音。

## URL 解析流程

```text
parse URL
validate host and path
read melody query
split by "-"
validate 16 tokens
decode title if present
map tokens to note model
store original URL + title + notes
```

存储：

- 保存原始 URL。
- 保存解析出的 title。
- 保存 16 个 note。
- 不保存任何 NookNet 页面 HTML。

## 播放方式

岛歌使用 Web Audio 合成，不依赖外部 mp3。

建议：

- 每个 token 固定短时值。
- note 使用简单 oscillator 或轻量包络。
- sustain 延长上一音符。
- rest 保持静音。
- 预览按钮只播放岛歌，不触发钟声。

岛歌音量使用 `townTuneVolume`。整点钟声默认跟随 `townTuneVolume`。

## UI 状态

设置和导览第三页显示：

- NookNet URL 输入。
- 标题。
- 16 个音符预览。
- Preview。
- Clear。
- 错误提示。

错误提示必须具体：

- `Only NookNet tune URLs are supported.`
- `The URL must include a melody parameter.`
- `The melody must contain 16 notes.`
- `Unsupported note token.`

## MQTT

`setTownTune` 命令只接受同样规则的 URL。校验失败返回 `rejected` ACK。
