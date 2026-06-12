# Evaluation Plan

| ID | Contract | Scenario | Input | Expected Result | Scoring Logic | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `E-001` | `C-001` | regression | Launch completed app | Home has only allowed clock/date/weather/background surface. | Playwright assertions pass. | `npm run test:e2e` | planned |
| `E-002` | `C-002` | happy | Fresh local storage onboarding | User can finish or skip onboarding and reach audio loading. | Playwright assertions pass. | `test/e2e/app.spec.ts` | planned |
| `E-003` | `C-003` | browser policy | Completed onboarding reload | Playback waits for explicit Start. | Playwright/audio mock assertions pass. | `test/e2e/app.spec.ts` | planned |
| `E-004` | `C-004`, `C-005` | audio | Hour/weather/BGM/town tune cases | Correct tracks and hourly flow are selected. | Unit tests pass. | `npm run test -- test/unit/audio.test.ts` or full `npm run test` | planned |
| `E-005` | `C-009`, `C-010` | security | MQTT state request | State payload excludes password and command ACKs route through L2. | Unit/E2E MQTT pass. | `test/unit/settingsRemote.test.ts`, `test/e2e/mqtt.spec.ts` | planned |
| `E-012` | `C-012` | baseline | Home idle pan, modal motion, onboarding transition | Repeatable metrics are emitted or unsupported APIs are reported. | Command exits 0 and records evidence path/summary. | `npm run test:e2e -- --project=chromium-desktop test/e2e/performance.spec.ts` | pass |
| `E-013` | `C-013` | parity | Same scenarios before/after optimization | Background pan, modal morph/liquid, transitions and audio effects remain observable. | E2E checks do not accept static fallback. | `test/e2e/performance.spec.ts`, updated home pan assertion | pass |
| `E-014` | `C-014` | performance | Preset pan enabled for 1.4 seconds | Per-frame style writes are removed and motion remains observable. | Same-machine before/after summary shows `styleMutationCount` drop while animation remains active. | `/tmp/acp-s005-perf/before-home-idle-preset-pan-summary.json`, `/tmp/acp-s005-perf/after-home-idle-preset-pan-summary.json` | pass |
| `E-015` | `C-015` | render | Audio slider edit while home is mounted | HomePage does not re-render for unrelated settings edits. | Render-counter delta is `0` and affected tests pass. | `test-results/performance-provider-rende-78c21-ot-amplify-HomePage-renders-chromium-desktop/provider-render-summary.json` | pass |
| `E-016` | `C-016` | modal | Open settings, switch category, close | Morph/liquid effects remain and layout-driving morph animation is removed. | Same-machine capture shows lower layout/task counts while E2E proves morph/liquid effects remain. | `/tmp/acp-s007-perf/before-settings-modal-open-switch-close-summary.json`, `/tmp/acp-s007-perf/after-settings-modal-open-switch-close-summary.json` | pass |
| `E-017` | `C-017` | cleanup | Dead-code removal PR | No behavior or architecture regression. | lint, typecheck, unit and affected E2E pass. | `npm run lint`, `npm run test`, `npm run build`, targeted app E2E, full performance E2E | pass |

## Maintenance Rules

- Every new performance optimization must point to a baseline and a parity check.
- Failure reports include scenario, actual result, expected result and owning contract.
- Do not paste full traces here; record artifact path or summary only.
