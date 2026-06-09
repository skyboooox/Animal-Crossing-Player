# Animal-Crossing-Player 浏览器存储设计

## 文档定位

本文定义浏览器本地存储策略：哪些数据存、存在哪里、什么时候加载、如何清理、如何提示风险。它补充 `PROJECT.md` 和 `UI_UX.md`，实现阶段以本文作为音频缓存、上传背景、设置持久化和配置导入导出的依据。

参考资料：

- CacheStorage：<https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage>
- StorageManager：<https://developer.mozilla.org/en-US/docs/Web/API/StorageManager>
- Origin Private File System：<https://developer.mozilla.org/docs/Web/API/File_System_API/Origin_private_file_system>
- Persistent storage：<https://web.dev/articles/persistent-storage>

## 设计目标

- 第二次进入同样配置时尽量少下载 mp3，节省服务器带宽并缩短启动等待。
- 首次启动只阻塞本次立即需要的音频，不预先下载 1.8G 资源。
- 用户上传背景只保存在浏览器本地，不上传服务器。
- 用户设置可导出 / 导入，但 MQTT 密码必须有明文风险确认。
- 缓存和本地文件可能被浏览器或用户清理，应用必须能恢复运行。

## 数据分类

| 数据 | 建议存储 | 是否可清除 | 说明 |
| --- | --- | --- | --- |
| 应用设置 | localStorage 或 IndexedDB | 清除设置时清除 | 语言、时间制式、天气模式、音量、BGM 版本等 |
| MQTT 非敏感配置 | localStorage 或 IndexedDB | 清除设置时清除 | URL、clientId、topic、QoS、retain |
| MQTT 用户名密码 | localStorage 或 IndexedDB | 清除 MQTT 配置时清除 | 仅在用户确认明文风险后保存 |
| 音频 mp3 响应 | CacheStorage | 清除音频缓存时清除 | 以 URL 为 key 缓存静态资源响应 |
| 音频缓存索引 | IndexedDB | 清除音频缓存时清除 | 记录 URL、版本、天气、小时、大小、时间 |
| 用户上传背景 | IndexedDB 或 OPFS | 清除背景或清除设置时清除 | 存储原文件 Blob 或 OPFS 文件句柄 |
| 最近 MQTT 日志 | IndexedDB 或内存 | 清除日志时清除 | 不保存密码和敏感 URL |
| 导出配置文件 | 用户下载文件 | 用户自行管理 | 含密码时导出前二次确认 |

## 音频缓存方案

音频 URL 响应使用 CacheStorage：

1. 根据 `audio.json` 得到目标 mp3 URL。
2. 使用 `caches.open('acp-audio-v1')` 打开音频缓存。
3. 用 `cache.match(request)` 检查是否命中。
4. 命中时读取响应并进入解码阶段。
5. 未命中时 `fetch(request)`，成功后 `cache.put(request, response.clone())`。
6. 同步更新音频缓存索引。

缓存 key 必须使用最终请求 URL。不要把版本、天气和小时拼成自定义字符串后丢失真实 URL，否则 Service Worker 或浏览器调试时难以定位。

### 首批加载

首批加载只包含：

- 当前小时 BGM。
- 当前配置需要的天气版本；缺失时回退 Sunny。
- `bell.mp3`。
- 当前岛歌播放或预览需要的数据。

首批加载必须在导览第四页显示进度。未完成前不能点击 `开始`。

### 播放中预加载

点击 `开始` 并进入首页后，立即预加载下一小时 BGM。它是播放连续性的准备，但不在首页展示状态。

### 后台扩展缓存

后台扩展缓存只在浏览器空闲、网络可用且用户开启音频缓存后运行。优先级：

1. 下一小时 BGM。
2. 当前版本当前天气 24 小时曲目。
3. 当前版本 Sunny 24 小时曲目。
4. 最近使用过的版本。

后台扩展缓存失败时只记录到设置页，不弹出首页错误。

## 上传背景存储方案

用户上传背景不上传服务器，只保存在浏览器本地。

默认方案：

- 小到中等图片使用 IndexedDB 保存 Blob。
- 保存字段：`id`、`name`、`type`、`size`、`createdAt`、`blob`。
- 首页通过 `URL.createObjectURL(blob)` 显示图片。
- 切换或清除背景时释放 Object URL。

可选增强：

- 如果未来需要更强的文件级管理，可以改用 OPFS。
- OPFS 适合较大文件和明确目录管理，但仍受浏览器配额限制，清除站点数据会删除内容。

背景清除边界：

- 清除音频缓存不清除用户上传背景。
- 清除当前背景只删除背景 Blob / OPFS 文件。
- 清除所有设置时可以删除上传背景，但必须二次确认。

## 存储配额与持久化

设置页应使用 `navigator.storage.estimate()` 显示：

- 当前站点已使用空间。
- 浏览器估算配额。
- 音频缓存占用。
- 上传背景占用。

持久化存储只在用户主动动作后请求：

- 用户开启长期音频缓存。
- 用户上传背景并选择保存。
- 用户点击“保护本地缓存”之类的明确按钮。

不要在页面启动时自动调用 `navigator.storage.persist()`。如果浏览器拒绝持久化请求，应用继续运行，只在设置页提示缓存可能被回收。

## MQTT 凭据与导出导入

`saveCredentials` 默认关闭。

用户勾选保存用户名密码时：

1. 弹窗提示用户名和密码将会明文存储在浏览器内。
2. 用户确认后，才保存 username 和 password。
3. 用户取消后，不保存 username 和 password，`saveCredentials` 保持关闭。

导出配置时：

- 不含 MQTT 密码：直接导出。
- 包含 MQTT 密码：弹窗提示密码将会明文存储在配置文件内，用户确认后才导出。

导入配置时：

- 若配置文件含 MQTT 密码，弹窗提示导入后密码会按配置明文存储在浏览器内。
- 用户取消时，不导入密码字段。

日志、MQTT state、MQTT error、调试信息永远不输出密码。

## 清除策略

设置页需要提供独立清除动作：

| 动作 | 清除内容 | 不清除内容 |
| --- | --- | --- |
| 清除音频缓存 | CacheStorage 音频响应、音频缓存索引 | 用户设置、MQTT 配置、岛歌 URL、上传背景 |
| 清除上传背景 | 上传背景 Blob / OPFS 文件、背景选择 | 音频缓存、MQTT 配置 |
| 清除 MQTT 配置 | MQTT URL、clientId、topic、用户名密码、远控日志 | 音频缓存、背景 |
| 清除所有设置 | 用户设置、MQTT 配置、上传背景、日志 | 可询问是否同时清除音频缓存 |
| 清除远控日志 | 最近 MQTT 日志 | MQTT 连接配置 |

所有危险清除都需要二次确认。

## 失败与恢复

- CacheStorage 不可用：直接 fetch mp3，并在设置页显示缓存不可用。
- 缓存写入失败：继续播放，记录失败。
- IndexedDB 不可用：用户上传背景只在当前会话预览，提示无法持久保存。
- OPFS 不可用：回退 IndexedDB。
- 配额不足：停止后台扩展缓存，保留必需加载。
- 缓存被浏览器清理：下次按首次加载流程重新下载需要的 mp3。

## 验收标准

- 首次进入只下载当前必须音频。
- 第二次进入同样配置时能从 CacheStorage 命中。
- 播放开始后会预加载下一小时 BGM。
- 清除音频缓存不会丢失用户设置、MQTT 配置或上传背景。
- 上传背景刷新页面后仍可显示。
- MQTT 密码保存和导出都必须有明文风险确认。
