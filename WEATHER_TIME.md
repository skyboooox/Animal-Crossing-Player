# Animal-Crossing-Player 天气与时间设计

## 文档定位

本文定义天气来源、自动定位、手动天气、天气到 BGM 的映射、时间格式和农历显示。

## 天气服务选择

自动天气使用：

- 浏览器 Geolocation 获取经纬度。
- Open-Meteo Forecast API 获取当前天气和当日最高 / 最低温。

选择原因：

- 不需要 API key，适合本地开发和浏览器端原型。
- 支持 HTTPS 和 JSON。
- 可请求当前温度、天气代码、降雨、降雪和每日最高 / 最低温。

发布为商业或高流量服务前，需要重新确认 Open-Meteo 用量、许可和署名要求。

## 自动天气流程

```text
request geolocation
if granted:
  call Open-Meteo forecast
  map response to Sunny/Rainy/Snowy
  save lastAuto snapshot
else:
  use lastAuto if present
  otherwise fallback Sunny
```

Open-Meteo endpoint：

```text
https://api.open-meteo.com/v1/forecast
```

推荐参数：

```text
latitude={lat}
longitude={lon}
current=temperature_2m,weather_code,precipitation,rain,snowfall
daily=temperature_2m_max,temperature_2m_min
timezone=auto
forecast_days=1
```

## 天气映射

输入优先级：

1. `snowfall > 0` 或天气代码属于雪类：Snowy。
2. `rain > 0`、`precipitation > 0` 或天气代码属于雨 / 雷雨类：Rainy。
3. 其他情况：Sunny。

映射只产出三种值：

```text
Sunny
Rainy
Snowy
```

这三个值同时驱动首页天气显示和 BGM 曲目选择。

## 手动天气

手动模式字段：

- `manualValue`：Sunny / Rainy / Snowy。
- `manualLocationLabel`：首页显示的位置摘要。

手动模式不调用天气 API。刷新天气按钮在手动模式下显示为不可用或提示切换到自动模式。

## 失败回退

| 场景 | 回退 |
| --- | --- |
| 用户拒绝定位 | 使用 lastAuto；没有则 Sunny |
| Open-Meteo 请求失败 | 使用 lastAuto；没有则 Sunny |
| 天气返回无法解析 | 使用 lastAuto；没有则 Sunny |
| 当前版本缺少该天气 BGM | BGM 回退 Sunny，天气显示仍保留实际值 |

首页不显示错误。设置页 Weather & Location 显示最近失败原因和刷新按钮。

## 刷新策略

- 自动天气启动时刷新一次。
- 后台刷新间隔建议 30 分钟。
- 用户在设置页手动点击刷新时立即刷新。
- 页面不可见时暂停周期刷新。

## 时间显示

时间来源：

- 浏览器本地时间。
- 小时用于 BGM 选择。

格式：

- `24h`：`00:05`。
- `12h`：`12:05 AM`。

跨午夜时必须正确选择下一小时：

```text
nextHour = (currentHour + 1) % 24
```

## 农历显示

农历使用 `lunar-javascript`。

首页只显示简短农历日期，例如：

```text
Lunar May 24
五月廿四
```

不在首页展示节气、宜忌、八字等扩展信息。语言由 `language` 设置决定。

## 测试要求

- 自动天气成功。
- 定位拒绝。
- API 失败。
- Snowy / Rainy / Sunny 映射。
- 手动天气不调用 API。
- 12h / 24h 格式。
- 跨午夜下一小时。
- 农历开关。
