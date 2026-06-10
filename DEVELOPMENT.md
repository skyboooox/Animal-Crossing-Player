# Animal-Crossing-Player 开发说明

## 文档定位

本文记录本地开发、依赖、Docker MQTT 和验证命令。产品、架构、测试矩阵分别见 `PROJECT.md`、`ARCHITECTURE.md`、`TEST_PLAN.md`。

## 当前状态

当前仓库已完成 React + Vite 基线和四层实现。`package.json` 已包含开发、构建、单元测试、端到端测试和 lint 脚本。

## 运行依赖

```text
animal-island-ui
lucide-react
lunar-javascript
mqtt
react
react-dom
```

## 开发依赖

```text
@playwright/test
@testing-library/jest-dom
@testing-library/react
@testing-library/user-event
@types/react
@types/react-dom
@vitejs/plugin-react
eslint
eslint-plugin-react-hooks
eslint-plugin-react-refresh
jsdom
prettier
typescript-eslint
typescript
vite
vitest
```

## 脚本

当前脚本：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "npm run build && playwright test",
    "lint": "eslint ."
  }
}
```

## 本地 MQTT Broker

启动：

```sh
docker compose -f docker-compose.mqtt.yml up -d
```

停止：

```sh
docker compose -f docker-compose.mqtt.yml down
```

连接信息：

```text
WebSocket URL: ws://localhost:9001
TCP URL: mqtt://localhost:1883
Username: acplayer
Password: acplayer-dev
```

WebSocket 验证：

```sh
npx -y mqtt@5.15.1 subscribe -l ws -h localhost -p 9001 -u acplayer -P acplayer-dev -t ac-player/v1/ws-test
npx -y mqtt@5.15.1 publish -l ws -h localhost -p 9001 -u acplayer -P acplayer-dev -t ac-player/v1/ws-test -m ws-ok
```

TCP 验证只用于命令行客户端，不是浏览器连接方式。

## 资源路径

```text
public/assets/audio.json
public/assets/bell.mp3
public/assets/backgroundPreset/
public/assets/New Horizons (Switch 2021)/
public/assets/New Leaf (3DS 2012)/
public/assets/City Folk (Wii 2008)/
public/assets/Wild World (DS 2005)/
```

音频路径包含空格、括号和撇号。代码必须使用 manifest 中的 URL，不手写拼接文件路径。

## 实施前检查

```sh
git status --short
docker ps --filter name=animal-crossing-player-mqtt
```

实现目录必须遵守四层架构：

```text
src/L1_Entry
src/L2_Core
src/L3_Business
src/L4_Atom
```

## 完成一次阶段后的检查

最小检查：

```sh
npm run test
npm run build
```

涉及 UI：

```sh
npm run dev
npm run test:e2e
```

涉及 MQTT：

```sh
docker compose -f docker-compose.mqtt.yml up -d
npm run test:e2e -- --grep MQTT
```

## 安全注意

- `acplayer-dev` 是本地开发密码，不得用于生产。
- 不提交生产 MQTT 密码、天气服务密钥或其他真实凭据。
- 应用保存 MQTT 密码必须经过明文存储确认。
