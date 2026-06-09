# Animal-Crossing-Player UI/UX 设计说明

## 文档定位

本文定义界面结构、交互流程、视觉语言、设置层级、状态与错误展示。产品边界看 [PROJECT.md](PROJECT.md)，技术结构看 [ARCHITECTURE.md](ARCHITECTURE.md)，具体状态字段看 [STATE_MODEL.md](STATE_MODEL.md)。

## 设计目标

本次重构不是给旧界面换皮，而是把应用重新设计成一个“岛屿时钟与电台”。首页只承担氛围展示：现在几点、今天日期、农历是否显示、天气怎样。播放版本、音量、天气位置、岛歌、远程控制、缓存和导入导出都收进设置。

首次进入显示导览弹窗。导览的核心原因是：用户必须先确定语言、BGM 版本和岛歌，应用才能知道本次需要加载哪些音频。音频加载发生在导览确认之后，并显示可感知进度。

UI 使用 `animal-island-ui` 作为主组件系统。项目可以补充布局 CSS 和少量缺失组件，但不重建一套旧式 UI。

## 体验原则

- 氛围优先：首页只显示时间、日期、农历、天气和背景。
- 导览先行：首次进入先导览，完成或跳过后进入首页。
- 设置收纳：复杂控制都在设置二级菜单中。
- 远控可查：MQTT 状态和日志在设置里可见，首页不显示。
- 错误有边界：首页不显示错误；阻塞错误使用导览层或 Modal。
- 移动优先：手机竖屏是默认设计基准，桌面端只扩展布局。
- 不复制官方素材：保留自然、圆润、贴纸感，不直接使用任天堂官方图形、角色或商标素材。

## 信息架构

```text
App Shell
  Home
  Settings
  Onboarding Modal
  Blocking Modal / Confirm Modal
```

主入口：

- `Home`：时间、日期、农历、天气、背景。
- `Settings`：所有配置和远控状态。

不要增加独立远控页面。远控属于 Settings 的 `Remote` 分区。

## 首页

首页显示：

- 当前时间。
- 当前日期。
- 可选农历。
- 当前天气。
- 温度、最高 / 最低温。
- 位置摘要。
- 背景。
- 轻量设置入口。

首页不显示：

- 音量。
- BGM 版本。
- 岛歌。
- 播放状态。
- 当前曲名。
- MQTT 状态。
- 缓存状态。
- 错误状态。
- 调试信息。

### 时间区

- 时间是视觉主角。
- 24 小时制示例：`09:05`。
- 12 小时制示例：`9:05 AM`。
- 日期和农历是辅助信息，不抢占天气区域。

### 天气区

展示：

- Sunny / Rainy / Snowy。
- 当前温度。
- 最高 / 最低温。
- 位置摘要。

天气刷新、天气模式和位置配置都在 Settings。

### 背景

背景类型：

- 纯色。
- 15 张预设图片。
- 用户上传图片。

所有背景必须保证首页文字可读。图片背景默认启用柔和遮罩或文字背板。

## 首次导览

导览是全屏或近全屏 Modal。它有明确边界、遮罩、步骤内容和固定操作区。

固定按钮：

- 左上角：`Skip`。
- 右上角：Settings 图标按钮。

`Skip` 不直接进入首页，而是应用默认配置后进入第四页音频加载。

默认配置：

- Language：English。
- Weather：Auto location。
- BGM：`New Horizons (Switch 2021)`。
- Town Tune：None。
- Volume：默认值见 [STATE_MODEL.md](STATE_MODEL.md)。

### 第 1 页：Language

选项：

- English。
- 简体中文。

选择后立即影响后续导览文案。

### 第 2 页：BGM Version

展示四个版本：

- `New Horizons (Switch 2021)`。
- `New Leaf (3DS 2012)`。
- `City Folk (Wii 2008)`。
- `Wild World (DS 2005)`。

只选择版本，不展示高级播放设置。

### 第 3 页：Town Tune

控件：

- NookNet URL 输入。
- 标题。
- 16 音符预览。
- Preview。
- Skip town tune。

只支持带 `melody=` 的 NookNet URL。详细规则见 [TOWN_TUNE.md](TOWN_TUNE.md)。

### 第 4 页：Audio Loading

进入该页后锁定本次选择并开始加载。

首批加载：

- 当前小时 BGM。
- `bell.mp3`。
- 岛歌音符数据。

进度必须展示：

- 已完成 / 总数。
- 当前资源名。
- 当前状态：检查缓存、下载、解码、已缓存、失败。
- Retry。

加载完成前 `Start` 不可用。加载完成后点击 `Start`，进入首页并直接尝试播放 BGM。

如果浏览器阻止音频播放，显示阻塞授权浮层，不在首页显示播放错误。

## Settings

设置页必须支持二级菜单。

桌面端：

```text
一级菜单 | 二级菜单 | 设置面板
```

移动端：

```text
一级菜单列表 -> 二级菜单列表 -> 设置面板
```

### Audio

二级菜单：

- Playback。
- Town Tune。
- Audio Cache。

Playback：

- BGM 版本。
- BGM 音量。
- 岛歌音量。
- 整点流程开关。
- 下一小时预加载开关。
- 淡入淡出时间。

Town Tune：

- NookNet URL。
- 标题。
- 16 音符预览。
- Preview。
- Clear。
- URL 错误提示。

Audio Cache：

- 音频缓存开关。
- 缓存当前版本。
- 清除音频缓存。
- 缓存占用和配额。
- 后台缓存进度。
- 最近缓存错误。

### Island

二级菜单：

- Weather & Location。
- Background。
- Date & Time。

Weather & Location：

- Auto location / Manual。
- 自动定位状态。
- 手动天气 Sunny / Rainy / Snowy。
- 手动位置显示名。
- Refresh weather。
- 最近天气错误。

Background：

- Solid / Preset / Uploaded。
- 纯色选择。
- 预设图片选择。
- 上传图片。
- 预览。
- 可读性遮罩。
- 清除上传背景。

Date & Time：

- 24h / 12h。
- 农历显示开关。
- 温度单位。

### Remote

二级菜单：

- MQTT Connection。
- Remote Log。

MQTT Connection：

- Enable remote control。
- WebSocket URL。
- Client ID。
- Username。
- Password。
- Save username/password。
- Base topic。
- QoS。
- Retain state。
- Test connection。
- 当前连接状态。

`Save username/password` 默认关闭。勾选时必须弹窗提示用户名和密码会明文存储在浏览器内。

Remote Log：

- 最近收到的命令。
- 最近发布的 ACK。
- 最近发布的 state。
- 最近错误。
- 清除日志。

### App

二级菜单：

- Language。
- Display。
- Maintenance & Debug。

Language：

- English。
- 简体中文。

Display：

- Motion：Full / Reduced。

Maintenance & Debug：

- 导出设置 JSON。
- 导入设置 JSON。
- 清除本地设置。
- 清除音频缓存。
- 查看调试信息。
- 查看最近错误。

导出包含 MQTT 密码时，必须弹窗提示密码将明文存储在配置文件内。

## 状态与错误

| 场景 | 展示位置 | 用户动作 |
| --- | --- | --- |
| 首批音频加载中 | 导览第 4 页 | 等待 |
| 首批音频失败 | 导览 / Modal | Retry |
| 浏览器阻止音频 | 阻塞 Modal | 点击授权 |
| 天气失败 | Settings | 刷新或切换手动 |
| 定位拒绝 | Settings | 改手动天气 |
| NookNet URL 无效 | 输入框下方 | 修改 URL |
| MQTT URL 协议错误 | 输入框下方 | 改 ws/wss |
| MQTT 断线 | Settings Remote | Retry / 查看日志 |
| 后台缓存失败 | Settings Audio Cache | 忽略或重试 |
| 导出含密码 | Confirm Modal | 继续 / 取消 |

首页不承载错误展示。

## 组件映射

优先使用 `animal-island-ui`：

- `Card`：时间、天气、设置分区。
- `Title`：页面和分组标题。
- `Button`：主动作、次动作、危险动作。
- `Input`：URL、Client ID、Username、Password、Topic。
- `Switch`：开关项。
- `Select`：BGM、语言、天气、背景、QoS。
- `Radio`：互斥偏好。
- `Tabs`：导览步骤或桌面详情切换。
- `Tooltip`：MQTT URL、QoS、Retain、缓存说明。
- `Loading`：导览加载。
- `Modal`：确认、阻塞错误、连接测试详情。
- `Table`：调试模式的日志。

缺失组件由项目补充：

- 确定性进度条。
- 16 音符预览。
- 背景图片网格。
- 二级设置导航。

## 视觉语言

- 整体像温暖的户外设备，不像深色控制台。
- 首页留白充足，时间为主角。
- 天气使用短标签和轻图标。
- 设置页密度高于首页，但仍保持圆润、温和。
- 不让页面被单一绿色填满。
- 危险操作只用在清除、覆盖导入、保存明文密码确认。

## 响应式要求

移动端：

- 触控目标不小于 44px。
- 导览接近全屏。
- 设置使用栈式二级菜单。
- 底部或角落设置入口不能遮挡时间和天气。

桌面端：

- 首页可两栏：时间为主，天气为辅。
- 导览居中。
- 设置三列布局。
- 不出现卡片套卡片。

## 可访问性

- 所有图标按钮必须有可读名称。
- 状态不能只靠颜色表达。
- 表单必须有 label。
- Modal 打开后焦点进入 Modal，关闭后回到触发按钮。
- 支持键盘操作主要控件。
- `prefers-reduced-motion` 下减少动效。
- MQTT 密码默认隐藏。
- 日志、错误和状态永远不显示密码。

## 设计验收标准

- 首次进入先显示导览弹窗。
- 导览四页完整，`Skip` 和 Settings 位置固定。
- `Skip` 进入音频加载页，不直接进首页。
- 音频加载完成前不能点击 `Start`。
- 点击 `Start` 后进入首页并尝试播放 BGM。
- 首页只显示时间、日期、可选农历和天气。
- Settings 二级菜单覆盖所有设置项。
- 背景支持纯色、预设和上传。
- MQTT 明文密码保存和导出都有二次确认。
- 移动端和桌面端无文本溢出、控件重叠、主按钮不可见。
