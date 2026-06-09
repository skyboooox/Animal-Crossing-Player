# Animal-Crossing-Player 资源清单

## 文档定位

本文记录当前仓库已经确认存在的静态资源、音频 manifest、加载边界和浏览器缓存策略。它服务于实现阶段的资源接入，不替代 `PROJECT.md` 的产品边界，也不展开 `PLAN.md` 的任务拆分。

## 当前资源概览

资源根目录：

```text
public/assets
```

当前规模：

- `public`：约 1.8G。
- `public/assets`：约 1.8G。
- `public/assets/backgroundPreset`：约 36M。

已确认资源类型：

- `audio.json`：BGM 小时曲目 manifest。
- `bell.mp3`：整点钟声资源。
- 四个 BGM 版本目录。
- 15 张背景预设图。

`public/locales` 当前为空；语言资源实现阶段需要另行补齐或内置在代码中。

## BGM 版本与音频数量

| 版本目录 | mp3 数量 | 目录大小 |
| --- | ---: | ---: |
| `New Horizons (Switch 2021)` | 173 | 583M |
| `New Leaf (3DS 2012)` | 200 | 591M |
| `City Folk (Wii 2008)` | 145 | 291M |
| `Wild World (DS 2005)` | 96 | 332M |
| `bell.mp3` | 1 | - |

总 mp3 数量：615。

## audio.json 覆盖范围

`audio.json` 当前提供四个版本的小时 BGM 映射：

| 版本 | Sunny | Rainy | Snowy |
| --- | ---: | ---: | ---: |
| `New Horizons (Switch 2021)` | 24 | 24 | 24 |
| `New Leaf (3DS 2012)` | 24 | 24 | 24 |
| `City Folk (Wii 2008)` | 24 | 24 | 24 |
| `Wild World (DS 2005)` | 24 | 0 | 0 |

实现要求：

- BGM 选择必须以 `audio.json` 为主，不从文件名临时猜测小时和天气。
- `Wild World (DS 2005)` 没有 Rainy / Snowy 映射；当天气不是 Sunny 时，需要定义回退策略，建议回退到 Sunny，并在设置或调试信息中记录回退原因。
- 切换 BGM 版本时，若当前天气没有对应曲目，也使用同版本 Sunny 曲目回退。

示例 0 点曲目：

| 版本 | 天气 | 路径 |
| --- | --- | --- |
| `New Horizons (Switch 2021)` | Sunny | `/assets/New Horizons (Switch 2021)/1-02. 1200 AM (Sunny).mp3` |
| `New Horizons (Switch 2021)` | Rainy | `/assets/New Horizons (Switch 2021)/2-01. 1200 AM (Rainy).mp3` |
| `New Horizons (Switch 2021)` | Snowy | `/assets/New Horizons (Switch 2021)/2-25. 1200 AM (Snowy).mp3` |
| `New Leaf (3DS 2012)` | Sunny | `/assets/New Leaf (3DS 2012)/025 - 12 AM.mp3` |
| `City Folk (Wii 2008)` | Sunny | `/assets/City Folk (Wii 2008)/1-11. 1200 AM (Sunny).mp3` |
| `Wild World (DS 2005)` | Sunny | `/assets/Wild World (DS 2005)/57 12 AM (AC_WW).mp3` |

## 背景资源

当前预设背景目录：

```text
public/assets/backgroundPreset
```

已确认 15 张图片：

```text
0.jpg
1.jpg
2.jpg
3.jpeg
4.jpeg
5.jpg
6.jpeg
7.jpg
8.jpeg
9.jpg
10.jpg
11.jpg
12.jpg
13.jpg
14.jpg
```

背景设置必须支持：

- 纯色背景。
- 预设图片背景。
- 用户上传图片背景。

用户上传图片应存储在浏览器本地，不上传到服务器。实现时优先使用 IndexedDB 或 OPFS 保存文件内容，并在设置页显示文件名、预览、占用空间和清除按钮。

## 首批加载规则

导览第四页和后续关键配置切换只加载本次立即需要的音频：

- 当前小时、当前天气、当前 BGM 版本对应的 BGM。
- 若当前版本缺少当前天气曲目，则加载同版本 Sunny 回退曲目。
- `bell.mp3`。
- 已导入岛歌在播放或预览时需要的音频数据。

播放开始后立即预加载下一小时 BGM。下一小时预加载不阻塞首页显示。

## 缓存策略

音频 URL 响应优先进入 CacheStorage。它适合以请求 URL 匹配 `public/assets` 下的 mp3 文件，并能减少第二次加载的服务器带宽与等待时间。

实现阶段建议分三个层次：

1. 必需加载：当前 BGM、钟声、岛歌，阻塞导览开始按钮。
2. 播放中预加载：下一小时 BGM，不阻塞首页。
3. 后台扩展缓存：当前版本 24 小时曲目、相邻天气曲目、最近使用版本。

缓存管理要求：

- 缓存命中时加载页显示 `已缓存`。
- 缓存失败不阻塞播放。
- 清除音频缓存只清除音频，不清除设置、MQTT 凭据、岛歌 URL 或用户上传背景。
- 使用 `navigator.storage.estimate()` 展示占用和配额。
- 在用户主动启用离线或长期缓存时，再调用 `navigator.storage.persist()` 请求持久化。

## 实现注意事项

- 音频路径包含空格、括号和撇号，代码中必须通过 URL 编码或 `new URL()` / manifest 字符串安全处理，不手写拼接未转义路径。
- 当前仓库资源较大，开发时避免无意义地全量复制或生成重复缓存。
- 首次导览跳过默认选择 `New Horizons (Switch 2021)`，天气自动定位；定位未完成时可先用 Sunny 回退完成必需加载。
- 发布前需要再次确认音频和图片资源授权范围。
