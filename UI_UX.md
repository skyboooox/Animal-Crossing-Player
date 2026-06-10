# Animal-Crossing-Player UI/UX 设计说明

## 文档定位

本文定义界面结构、交互流程、视觉语言、设置层级、状态与错误展示。产品边界看 [PROJECT.md](PROJECT.md)，技术结构看 [ARCHITECTURE.md](ARCHITECTURE.md)，具体状态字段看 [STATE_MODEL.md](STATE_MODEL.md)。

## 设计目标

本次重构不是给旧界面换皮，而是把应用重新设计成一个“岛屿时钟与电台”。首页只承担氛围展示：现在几点、今天日期、农历是否显示、天气怎样。播放版本、音量、天气位置、岛歌、远程控制、缓存和导入导出都收进设置。

首次进入显示导览弹窗。导览的核心原因是：用户必须先确定语言、BGM 版本和岛歌，应用才能知道本次需要加载哪些音频。音频加载发生在导览确认之后，并显示可感知进度。首次导览完成后的再次打开仍先显示启动音频弹窗：弹窗自动加载当前配置需要的音频，加载完成后用户点击 `Start` 才开始播放。

UI 使用 `animal-island-ui` 作为主组件系统。项目可以补充布局 CSS 和少量缺失组件，但不重建一套旧式 UI。

已有组件优先级：

- 操作按钮、输入、开关、选择器、弹窗、卡片、单选、多选、表格、折叠、分割线、加载动画优先使用 `animal-island-ui`。
- 图标优先使用自托管 Fluent Emoji SVG：圆润、彩色、具象，避免抽象线框图标。
- Fluent Emoji 资源放在 `public/assets/icons/fluent-emoji/`，来源为 Microsoft `fluentui-emoji`，遵循 MIT 许可并保留许可文件。
- 应用 CSS 只负责布局、响应式、业务状态和库组件无法表达的视觉补充。
- 只有库中没有等价能力时才保留自定义业务组件，例如岛歌音符预览、音频加载进度、背景缩略图。
- 新增 UI 前先检查 `animal-island-ui` 线上文档和本地类型声明，避免重复造组件。

## 体验原则

- 氛围优先：首页只显示时间、日期、农历、天气和背景。
- 导览先行：首次进入先导览，完成或跳过后进入首页。
- 二次启动门控：首次导览完成后，每次重新打开页面先弹出音频启动弹窗，加载完成后等待用户点击 `Start`。
- 设置收纳：复杂控制都在设置弹窗中，入口层像 App 启动台。
- 远控可查：MQTT 状态和日志在设置里可见，首页不显示。
- 错误有边界：首页不显示错误；阻塞错误使用导览层或 Modal。
- 移动优先：手机竖屏是默认设计基准，桌面端只扩展布局。
- 不复制官方素材：保留自然、圆润、贴纸感，不直接使用任天堂官方图形、角色或商标素材。

## 字体

字体必须服务“岛屿电台”的圆润游戏感，不能回退成默认系统工具感。

- 全局 UI：应用入口显式加载 `animal-island-ui/style`，并使用 `animal-island-ui` 提供的 Nunito / Noto Sans SC 字体资源和圆润字体栈。
- 主字体：全局 UI、标题、按钮、设置入口、标签和首页时间使用 `public/assets/AlimamaFangYuanTiVF-Thin-2.ttf` 提供的 Alimama FangYuanTi VF。
- 回退字体：Nunito / Noto Sans SC 保留为后备，保证字体文件加载失败时中英文文案仍清晰稳定。
- 可选系统回退：`Zen Maru Gothic`、`HarmonyOS Sans SC`、`MiSans`、`PingFang SC`、`Microsoft YaHei`、sans-serif。
- 首页时间：使用展示字体，数字加粗，启用等宽数字，避免秒级刷新造成横向跳动。
- 不引入未授权的任天堂官方字体、商标字体或从游戏中提取的字体文件。

## 国际化

- 当前 UI 语言覆盖 English 和简体中文。
- 每个语言使用独立 JSON 语言包，文件放在 `public/locales/<language>.json`。
- 语言切换必须热切换：当前弹窗、当前设置分区、首页日期和天气显示立即更新，不要求刷新页面。
- UI 文案来自集中 i18n 入口读取的 `public/locales` 语言 JSON；组件不直接写中英文分支。
- 语言选择控件从语言注册表生成，后续新增语言只补语言元数据和 `public/locales` JSON 语言包。
- 天气显示名、状态前缀、空状态、确认提示和 aria label 都属于可翻译文案。
- BGM 版本名、MQTT 协议字段、Topic、payload 字段、配置键、资源路径和 NookNet URL 不翻译。

## 信息架构

```text
App Shell
  Home
  Settings Modal
  Onboarding Modal
  Blocking Modal / Confirm Modal
```

主入口：

- `Home`：时间、日期、农历、天气、背景。
- `Settings Modal`：所有配置和远控状态。

不要增加独立远控页面。远控属于 Settings 的 `Remote` 分区。

## 弹窗布局

- 所有弹窗的内容区域在弹窗外形内水平居中。
- 标题、步骤内容、设置启动台、设置分区内容和操作区使用统一的居中内容宽度。
- 内容可滚动时只滚动弹窗内内容，不让内容贴到左上角。
- 表单和日志等密集内容可以保持字段左对齐，但整个面板仍居中。
- 设置弹窗内的 `Select` 下拉层使用紧凑浮层：在控件下方展开，按内容收缩，不撑满整行，不得横向弹出到弹窗或页面外。
- 设置弹窗顶部的 `Settings` / `Home` 导航按钮使用轻量图标胶囊样式，不能像默认表单按钮一样抢过标题和内容层级。
- 页面内标题不用 `animal-island-ui` 的 `Title` 缎带样式。页面标题使用游戏对话式棕色圆润文字，分组标题使用低层级小标签。

## 首页

首页显示：

- 当前时间。
- 当前日期。
- 可选农历。
- 当前天气。
- 温度、最高 / 最低温。
- 位置摘要。
- 背景。
- 轻量设置入口；导览弹窗打开时隐藏该入口。
- 设置入口图标使用 Fluent Emoji 的 `hammer-and-wrench`，不使用画笔、文档或普通 App 图标。

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

导览是全屏或近全屏 Modal。它有明确边界、遮罩、步骤内容和弹窗内主操作区。

固定按钮：

- 页面左上角：`Skip`，位于弹窗外。
- 页面右上角：Settings 图标按钮，位于弹窗外。
- 弹窗右下角：`Next`、`Start` 或当前步骤主动作。

导览打开时，首页右上角设置入口不显示，避免和首次设置页面右上角设置入口重复。

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

选择后立即热切换当前导览文案和后续导览文案，不等待刷新、关闭弹窗或点击下一步。

### 第 2 页：BGM Version

展示四个版本：

- `New Horizons (Switch 2021)`。
- `New Leaf (3DS 2012)`。
- `City Folk (Wii 2008)`。
- `Wild World (DS 2005)`。

四个版本必须使用双排网格展示，桌面和常规移动弹窗宽度下保持 2 x 2 结构；极窄屏只允许为避免文本溢出降为单列。

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

状态展示必须使用当前语言的用户文案，不显示 `ready`、`cached`、`failed` 等内部状态枚举，避免出现“已就绪 · ready”这类重复表达。

音频加载失败时自动重试，不显示手动 Retry 按钮。进度文案可以显示当前资源和失败 / 重试状态。

加载完成前 `Start` 不可用。加载完成后点击 `Start`，进入首页并直接尝试播放 BGM。

如果浏览器阻止音频播放，显示阻塞授权浮层，不在首页显示播放错误。

## 再次启动音频弹窗

首次导览完成后，再次刷新或重新打开页面时不重复显示语言、BGM 和岛歌步骤，而是显示独立的启动音频弹窗。

流程：

- 弹窗打开后自动加载当前配置对应的当前小时 BGM、`bell.mp3` 和岛歌数据。
- 弹窗只显示标题、加载进度、状态和 `Start`，不显示额外说明段落。
- 加载失败时沿用音频加载页的自动重试规则，不显示手动 Retry 按钮。
- 加载完成前 `Start` 不可用。
- 点击 `Start` 后在该用户手势中播放 BGM，并关闭弹窗。
- 浏览器阻止播放时显示音频授权浮层；首页仍不显示播放错误。

## Settings

Settings 是弹窗，不是独立全屏页面。弹窗初始层是图标 + 描述的启动台，类似 App Launcher。点击入口后进入第二层设置内容。

菜单只有两个级别：

```text
设置启动台 -> 设置分区内容
```

禁止再出现“一级菜单 | 二级菜单 | 设置面板”的三级导航。每个分区内容可以在同一面板内用区块标题组织，但不能再做第三层菜单。

### Audio

启动台入口描述：Playback、Town Tune、Audio Cache。

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

启动台入口描述：Weather & Location、Background、Date & Time。

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

启动台入口描述：MQTT Connection、Remote Log。

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

启动台入口描述：Language、Display、Maintenance & Debug。

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
- `Button`：主动作、次动作、危险动作。
- `AppIcon`：按钮、启动台和状态入口图标，使用本地 Fluent Emoji SVG。
- `Input`：URL、Client ID、Username、Password、Topic。
- `Switch`：开关项。
- `Select`：BGM、语言、天气、背景、QoS。
- `Radio`：互斥偏好。
- `Tabs`：导览步骤或桌面详情切换。
- `Tooltip`：MQTT URL、QoS、Retain、缓存说明。
- `Loading`：导览加载。
- `Modal`：确认、阻塞错误、连接测试详情。
- `Table`：调试模式的日志。

本地组件：

- `GameHeading`：页面内标题和分组标题；避免把 `Title` 的缎带视觉放进页面内容。

缺失组件由项目补充：

- 确定性进度条。
- 16 音符预览。
- 背景图片网格。
- 设置启动台。

## 视觉语言

- 整体像温暖的户外设备，不像深色控制台。
- 首页留白充足，时间为主角。
- 天气使用短标签和轻图标。
- 设置弹窗密度高于首页，但仍保持圆润、温和。
- 不让页面被单一绿色填满。
- 危险操作只用在清除、覆盖导入、保存明文密码确认。

## 响应式要求

移动端：

- 触控目标不小于 44px。
- 导览接近全屏。
- 设置弹窗接近全屏，初始层为启动台。
- 底部或角落设置入口不能遮挡时间和天气。

桌面端：

- 首页可两栏：时间为主，天气为辅。
- 导览居中。
- 设置弹窗和内部内容居中，初始层为启动台，第二层为单分区内容。
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
- 导览四页完整，`Skip` 和 Settings 固定在页面角落且不在弹窗内，`Next` / `Start` 固定在弹窗右下角。
- 导览打开时首页右上角设置入口不显示。
- Language 选择立即热切换当前和后续导览文案。
- BGM Version 四个选项显示为 2 x 2 双排网格。
- `Skip` 进入音频加载页，不直接进首页。
- 音频加载失败自动重试，不显示 Retry 按钮；加载完成前不能点击 `Start`。
- 点击 `Start` 后进入首页并尝试播放 BGM。
- 首次导览完成后的再次打开先显示启动音频弹窗，自动加载音频，加载完成后点击 `Start` 才播放。
- 首页只显示时间、日期、可选农历和天气。
- Settings 是弹窗，初始层为图标 + 描述启动台，第二层覆盖所有设置项。
- 所有弹窗内容区域居中，启动台或表单面板不贴左上角。
- 设置弹窗内的列表选择下拉层保持紧凑，不撑满表单宽度，也不能越出弹窗或页面边界。
- 设置弹窗顶部 `Settings` / `Home` 是轻量导航按钮，风格要和弹窗、启动台卡片一致。
- 首页、导览、设置和阻塞弹窗在 English / 简体中文之间热切换。
- 背景支持纯色、预设和上传。
- MQTT 明文密码保存和导出都有二次确认。
- 移动端和桌面端无文本溢出、控件重叠、主按钮不可见。
