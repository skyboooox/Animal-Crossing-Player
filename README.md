# Animal-Crossing-Player

Browser Animal Crossing ambience clock and music player.

The app shows a quiet island clock, date, optional lunar date, weather and background while it plays Animal Crossing-style hourly BGM. Setup, audio, weather, background and MQTT remote control live in onboarding and settings, not on the home screen.

## Current Stack

- React 18 + Vite + TypeScript.
- `animal-island-ui` for primary UI primitives.
- Vitest for unit tests.
- Playwright for browser flows.
- MQTT.js over WebSocket for browser remote control.

## Commands

```sh
npm install
npm run dev
npm run test
npm run lint
npm run build
npm run test:e2e
```

Local MQTT WebSocket broker:

```sh
docker compose -f docker-compose.mqtt.yml up -d
docker compose -f docker-compose.mqtt.yml down
```

Browser MQTT URL for local development: `ws://localhost:9001`.
The MQTT E2E spec skips when this broker is not running.

## Documents

| File | Purpose |
| --- | --- |
| `PROJECT.md` | Product boundary: goals, scope, non-goals, constraints, acceptance. |
| `ARCHITECTURE.md` | Four-layer code structure and dependency rules. |
| `PLAN.md` | Handoff state, Sprint list, current Sprint contract. |
| `TEST_PLAN.md` | Verification matrix and release checks. |
| `docs/contract-index.md` | Contract routing from behavior to code and tests. |
| `docs/eval-plan.md` | Pass/fail evaluation cases. |
| `docs/agent-boundaries.md` | Agent roles, write scopes, escalation rules. |
| `docs/tool-inventory.md` | Commands, tools, risk and verification use. |
| `docs/websearch/index.md` | Research index for current external facts. |

`docs.old/` is archive input only and is safe to delete after this handoff.
