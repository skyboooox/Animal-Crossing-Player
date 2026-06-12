# Contract Index

Only list contracts that constrain code, tests, config or runtime behavior.

| ID | Contract | Source | Code Location | Tests Or Verification | Status |
| --- | --- | --- | --- | --- | --- |
| `C-001` | Home shows only time, date, optional lunar date, weather and background. | `PROJECT.md#Goals` | `src/L1_Entry/pages/HomePage.tsx` | `test/e2e/app.spec.ts` | implemented |
| `C-002` | Onboarding covers language, BGM version, town tune and audio loading. | `PROJECT.md#First-Version Scope` | `src/L1_Entry/onboarding/`, `src/L2_Core/onboardingCore.ts` | `test/e2e/app.spec.ts`, `test/unit/onboardingAudioLoading.test.tsx` | implemented |
| `C-003` | Audio starts only after a user gesture. | `PROJECT.md#Acceptance Criteria` | `src/L1_Entry/startup/StartupAudioModal.tsx`, `src/L2_Core/startupCore.ts` | `test/e2e/app.spec.ts` | implemented |
| `C-004` | BGM is selected by hour, weather and selected game version. | `PROJECT.md#Goals` | `src/L3_Business/audio/selectTrack.ts`, `src/L2_Core/audioCore.ts` | `test/unit/audio.test.ts` | implemented |
| `C-005` | Hourly flow fades BGM, plays town tune/bells and starts next-hour BGM. | `PROJECT.md#Goals` | `src/L2_Core/audioCore.ts`, `src/L4_Atom/audio/webAudio.ts` | `test/unit/audio.test.ts`, affected E2E | implemented |
| `C-006` | Town tune import supports NookNet URL only. | `PROJECT.md#Goals` | `src/L3_Business/townTune/parseNookNetUrl.ts` | `test/unit/townTune.test.ts` | implemented |
| `C-007` | Weather supports browser Geolocation auto mode and manually specified locations via Open-Meteo, refreshing every 10 minutes. | `PROJECT.md#Goals` | `src/L2_Core/weatherCore.ts`, `src/L3_Business/weather/` | `test/unit/weatherTime.test.ts`, `test/e2e/app.spec.ts` | implemented |
| `C-008` | Settings are modal-based and persisted in browser storage. | `PROJECT.md#Acceptance Criteria` | `src/L1_Entry/settings/`, `src/L2_Core/settingsCore.ts`, `src/L4_Atom/storage/` | `test/e2e/app.spec.ts`, `test/unit/appState.test.ts` | implemented |
| `C-009` | MQTT browser remote control is WebSocket-only and routes commands through L2. | `PROJECT.md#Constraints` | `src/L2_Core/remoteControlCore.ts`, `src/L1_Entry/adapters/mqttCommandEntry.ts` | `test/unit/settingsRemote.test.ts`, `test/e2e/mqtt.spec.ts` | implemented |
| `C-010` | MQTT password never appears in state messages or logs. | `PROJECT.md#Constraints` | `src/L2_Core/remoteControlCore.ts`, `src/L3_Business/settings/sanitizeSensitiveConfig.ts` | `test/unit/settingsRemote.test.ts`, MQTT smoke | implemented |
| `C-011` | Release requires licensing, HTTPS/`wss://` and Open-Meteo production policy confirmation. | `PROJECT.md#Open Release Risks` | release docs/config | manual release gate | planned |
| `C-012` | Performance work must start with repeatable baseline evidence. | `TEST_PLAN.md#Performance Coverage` | `test/e2e/performance.spec.ts` | S-004 command in `PLAN.md` | verified |
| `C-013` | Performance work must preserve all observable visual and audio effects. | `PROJECT.md#Acceptance Criteria` | `test/e2e/performance.spec.ts`, `test/e2e/app.spec.ts` | E2E effect parity, audio unit/E2E tests | verified through S-008 |
| `C-014` | Home preset pan should avoid avoidable per-frame paint-heavy style writes while preserving motion. | `ARCHITECTURE.md#Performance Refactor Direction` | `src/L1_Entry/pages/HomePage.tsx`, `src/L1_Entry/styles.css` | `test/e2e/performance.spec.ts`, `/tmp/acp-s005-perf/*home-idle-preset-pan-summary.json` | verified for S-005 |
| `C-015` | Provider/controller split must reduce unrelated renders without moving business decisions out of L2. | `ARCHITECTURE.md#Performance Refactor Direction` | `src/L1_Entry/providers.tsx`, `src/L1_Entry/appContext.ts`, `src/L1_Entry/pages/HomePage.tsx` | render-counter evidence, unit/E2E | verified for S-006 |
| `C-016` | Modal motion optimization must keep morph/liquid effects and reduce layout/paint overhead. | `ARCHITECTURE.md#Performance Refactor Direction` | `src/L4_Atom/ui/animalIsland.tsx`, `src/L1_Entry/styles.css` | modal E2E plus performance capture | verified for S-007 |
| `C-017` | Cleanup removes dead or duplicated code only after behavior and performance gates are in place. | `PLAN.md#Sprint Contract: S-008 Cleanup After Measured Fixes` | files identified by earlier Sprints | lint, typecheck, tests, architecture test | verified for S-008 |

## Maintenance Rules

- Update this index before changing public behavior, architecture boundaries or performance acceptance.
- Code locations are entry points, not duplicated implementation notes.
- Deleted contracts require synchronized code, tests and docs cleanup.
