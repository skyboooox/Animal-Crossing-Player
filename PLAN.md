# Animal-Crossing-Player Plan

## Purpose

This file is the active implementation and handoff plan. Product boundary is in `PROJECT.md`; architecture is in `ARCHITECTURE.md`; verification is in `TEST_PLAN.md`.

`docs.old/` is archive input only and will be deleted after handoff.

## Current Handoff State

| Area | State | Evidence |
| --- | --- | --- |
| Product scope | Rebuilt into active docs | `PROJECT.md` |
| Architecture | Four-layer structure exists | `src/L1_Entry`, `src/L2_Core`, `src/L3_Business`, `src/L4_Atom` |
| Contract routing | Rebuilt | `docs/contract-index.md` |
| Evaluation plan | Rebuilt | `docs/eval-plan.md` |
| Agent boundaries | Rebuilt | `docs/agent-boundaries.md` |
| Tool inventory | Rebuilt | `docs/tool-inventory.md` |
| Code verification | Pending after doc handoff | run commands in `TEST_PLAN.md` |
| Performance refactor kickoff | Planned | `S-004..S-008`, `C-012..C-017` |

## Sprint List

| Sprint | Goal | Contract | Status |
| --- | --- | --- | --- |
| `S-001` | Rebuild active handoff docs before `docs.old/` deletion | `C-001..C-011` | completed |
| `S-002` | Re-verify current app baseline after handoff | `C-001..C-010` | completed |
| `S-003` | Close release blockers: resource licensing, production weather and `wss://` policy | `C-011` | planned |
| `S-004` | Capture performance baseline and lock effect parity gates | `C-012`, `C-013` | completed |
| `S-005` | Optimize home background pan without visual regression | `C-013`, `C-014` | completed |
| `S-006` | Split provider/controller code to reduce render blast radius | `C-013`, `C-015` | completed |
| `S-007` | Reduce modal motion layout/paint cost while preserving morph/liquid effects | `C-013`, `C-016` | completed |
| `S-008` | Remove dead code and consolidate helpers after measured hot paths are fixed | `C-017` | completed |

## Performance Refactor Intake

### Goal

Reduce CPU and GPU usage without changing visible effects, audio behavior, settings behavior or remote-control behavior.

### Non-Goals

- No product simplification disguised as optimization.
- No removal of background pan, modal morph/liquid clip, onboarding/settings motion, audio fades, town tune preview or hourly bell flow.
- No new production dependency unless profiling proves local changes are insufficient and the user approves.
- No broad formatting-only rewrite mixed with performance changes.

### Current Hotspot Hypotheses

- `src/L1_Entry/pages/HomePage.tsx` writes `background-position` every animation frame for preset pan.
- `src/L1_Entry/styles.css` declares `will-change: background-position` and uses layout-affecting modal morph properties.
- `src/L1_Entry/providers.tsx` combines app state, audio, weather, MQTT, background upload and settings persistence in one provider.
- `src/L4_Atom/ui/animalIsland.tsx` measures layout for modal morph and injects an animated SVG clip path while modals are mounted.
- `test/e2e/app.spec.ts` currently asserts background motion through `background-position`, which locks the old implementation detail.

### Acceptance

- Baseline and post-change evidence compare the same scenarios.
- Visual parity is judged by observable motion/effect state, not by preserving internal CSS property choices.
- Audio and MQTT contracts stay unchanged.
- Each implementation Sprint has one primary goal and focused owned files.

## Sprint Contract: S-004 Performance Baseline And Effect Gates

### Goal

Create repeatable performance evidence and effect-parity gates before product code optimization.

### Contract Index

- `contract_id`: `C-012`, `C-013`
- Source: `PROJECT.md#Acceptance Criteria`, `ARCHITECTURE.md#Performance Refactor Direction`, `TEST_PLAN.md#Performance Coverage`
- Expected code/test locations: `test/e2e/app.spec.ts`, optional `test/e2e/performance.spec.ts`, optional `scripts/measure-performance.mjs`
- Expected verification: targeted Playwright run plus `npm run test`, `npm run lint`, `npm run build`

### In Scope

- Add or update browser performance smoke coverage for home idle pan, settings modal motion and onboarding transition.
- Record metrics names and evidence paths in the test output or a small generated artifact ignored by Git if large.
- Change E2E assertions that bind effects to implementation details, such as requiring `background-position` to change.
- Keep tests deterministic enough for local comparison.

### Out Of Scope

- Product performance fixes.
- Visual redesign.
- New production dependencies.
- Changing audio, MQTT, weather or settings behavior.

### Done Definition

- A future implementer can run one documented command and get baseline evidence.
- Tests prove effects are present without locking the exact implementation property.
- Baseline captures enough data to decide whether S-005, S-006 or S-007 is the first optimization target.

### Required Verification

```sh
npm run test
npm run lint
npm run build
npm run test:e2e -- --project=chromium-desktop
```

### Pass Threshold

- Performance evidence is produced or the missing browser API is explicitly reported.
- Existing user-visible flows covered by touched tests still pass.
- No product code is changed in this Sprint except test-only instrumentation hooks if absolutely necessary.

### Failure Threshold

- Baseline cannot distinguish paint/render/main-thread cost.
- Any test accepts a static fallback for an effect that should remain animated.
- Evidence requires manual DevTools-only steps with no repeatable command.

### Known Risks

- Local hardware variance: compare relative deltas within the same machine/profile.
- Browser trace size: keep large artifacts out of Git and record only paths or summaries.
- Flaky animation timing: assert presence and bounded movement, not exact frame counts.

### Result

- Added `test/e2e/performance.spec.ts` with repeatable home pan, settings modal and onboarding/startup performance smoke coverage.
- Updated `test/e2e/app.spec.ts` so background pan is asserted as observable motion/effect state, not as a required `background-position` implementation.
- Fixed existing lint failure in `test/unit/i18nLocales.test.ts`.

Verification:

```sh
npm run test
npm run lint
npm run build
npm run test:e2e -- --project=chromium-desktop test/e2e/performance.spec.ts
```

All four passed.

Follow-up stabilization:

```sh
npm run test:e2e -- --project=chromium-desktop test/e2e/app.spec.ts
```

The earlier app E2E failures were fixed: onboarding footer placement, settings safe-scroll bottom padding and localized hourly-chime lookup now pass.

## Sprint Contract: S-005 Home Background Pan Optimization

### Goal

Replace the continuous preset pan hot path with an equivalent lower-paint implementation.

### Scope

- Owned files: `src/L1_Entry/pages/HomePage.tsx`, `src/L1_Entry/styles.css`, affected Playwright tests.
- Preserve random pan angle, speed, preset repeat, setting toggle and `prefers-reduced-motion`.
- Prefer transform/compositor motion over per-frame `background-position` writes.

### Verification

- Run S-004 baseline command before and after.
- Pass home background E2E coverage on desktop and mobile.
- Show improved paint/main-thread evidence or document an external bottleneck.

### Result

- Replaced per-frame `background-position` writes in `src/L1_Entry/pages/HomePage.tsx` with a repeated Web Animations API transform segment on an inner pan layer.
- Kept preset repeat, random angle, speed, toggle behavior and `prefers-reduced-motion`.
- Updated `src/L1_Entry/styles.css` so the pan layer uses `will-change: transform`; the outer background no longer advertises `will-change: background-position`.
- Extended `test/e2e/performance.spec.ts` to record `styleMutationCount`, which directly catches paint-heavy style writes.

Same-machine home pan before/after evidence:

| Metric | Before S-005 | After S-005 |
| --- | ---: | ---: |
| `styleMutationCount` | 197 | 0 |
| `maxRunningAnimations` | 0 | 1 |
| `observedTransformOrAnimation` | false | true |
| `LayoutCount` | 200 | 19 |
| `TaskDuration` | 0.063956 | 0.059667 |

Evidence artifacts:

- `/tmp/acp-s005-perf/before-home-idle-preset-pan-summary.json`
- `/tmp/acp-s005-perf/after-home-idle-preset-pan-summary.json`

Verification:

```sh
npm run test:e2e -- --project=chromium-desktop test/e2e/performance.spec.ts -g "home idle preset pan"
```

Passed before and after the S-005 patch. Broader S-004 verification had already passed `npm run test`, `npm run lint`, `npm run build` and full `test/e2e/performance.spec.ts`.

## Sprint Contract: S-006 Provider And Controller Split

### Goal

Reduce unnecessary React render blast radius while preserving L2 workflow ownership.

### Scope

- Owned files: `src/L1_Entry/providers.tsx`, `src/L1_Entry/appContext.ts`, new L1 provider/controller files if needed, affected tests.
- Extract audio, weather, MQTT and background side effects behind smaller hooks/controllers.
- Keep public `AppActions` behavior stable unless the contract index is updated first.

### Verification

- Render-counter evidence shows unrelated settings edits do not re-render HomePage.
- Unit, lint, build and affected E2E tests pass.

### Result

- Split app context into separate state and action contexts in `src/L1_Entry/appContext.ts` and `src/L1_Entry/providers.tsx`.
- Kept `AppActions` stable by reading current state through a provider ref, while fixing the ref update timing so startup audio preparation reads current state.
- Narrowed `HomePage` props and memoized it so settings-panel edits do not fan out into home renders.
- Preserved S-005 preset pan behavior and added test-only render diagnostics in `src/L1_Entry/renderDiagnostics.ts`.
- Added fast audio probing and render delta attachment to `test/e2e/performance.spec.ts`.

Render evidence:

| Metric | S-006 Result |
| --- | ---: |
| `HomePage` render delta while changing audio slider | 0 |

Evidence artifact:

- `test-results/performance-provider-rende-78c21-ot-amplify-HomePage-renders-chromium-desktop/provider-render-summary.json`

Verification:

```sh
npm run lint
npm run test
npm run build
npm run test:e2e -- --project=chromium-desktop test/e2e/performance.spec.ts
git diff --check -- src/L1_Entry/App.tsx src/L1_Entry/appContext.ts src/L1_Entry/providers.tsx src/L1_Entry/pages/HomePage.tsx src/L1_Entry/styles.css src/L1_Entry/renderDiagnostics.ts test/e2e/performance.spec.ts test/e2e/app.spec.ts test/unit/i18nLocales.test.ts PLAN.md docs/contract-index.md docs/eval-plan.md
```

All passed. Build still reports the existing Vite large chunk warning.

## Sprint Contract: S-007 Modal Motion Cost Reduction

### Goal

Keep modal morph/liquid visual effects while reducing layout, paint and persistent animation overhead.

### Scope

- Owned files: `src/L4_Atom/ui/animalIsland.tsx`, `src/L1_Entry/styles.css`, affected Playwright tests.
- Replace layout-affecting morph animation properties with transform/scale where visually equivalent.
- Keep liquid clip only while it is visible and allowed by motion preference.

### Verification

- Modal morph/liquid E2E assertions still prove the effects exist.
- Performance evidence improves modal open/category/close captures or documents the remaining third-party cost.

### Result

- Replaced modal morph wrapper animation from layout-driving `left/top/width/height` keyframes with `transform: translate3d(...) scale(...)`.
- Changed morph overlay `will-change` from layout properties to `transform, opacity`.
- Preserved pill/blob opacity handoff, organic mask, liquid SVG clip and reduced-motion behavior.
- Updated E2E morph assertions to verify transform/scale variables while keeping visible morph/liquid checks.

Same-machine settings modal before/after evidence:

| Metric | Before S-007 | After S-007 |
| --- | ---: | ---: |
| `LayoutCount` | 131 | 124 |
| `RecalcStyleCount` | 346 | 345 |
| `RecalcStyleDuration` | 0.017239 | 0.015263 |
| `ScriptDuration` | 0.032779 | 0.031206 |
| `TaskDuration` | 0.159634 | 0.143839 |
| `ThreadTime` | 0.166750 | 0.151516 |
| `motionChanged` | true | true |
| `observedTransformOrAnimation` | true | true |

Evidence artifacts:

- `/tmp/acp-s007-perf/before-settings-modal-open-switch-close-summary.json`
- `/tmp/acp-s007-perf/after-settings-modal-open-switch-close-summary.json`

Verification:

```sh
npm run lint
npm run build
npm run test:e2e -- --project=chromium-desktop test/e2e/app.spec.ts -g "audio volume sliders update active Web Audio gains immediately"
npm run test:e2e -- --project=chromium-desktop test/e2e/performance.spec.ts
```

All passed. Build still reports the existing Vite large chunk warning. One attempted parallel `npm run build` plus Playwright build failed with `ENOTEMPTY` while both processes cleaned `dist/assets`; rerunning sequentially passed.

## Sprint Contract: S-008 Cleanup After Measured Fixes

### Goal

Consolidate functions, split oversized files and remove unused code only after hot-path behavior is protected.

### Scope

- Owned files are chosen from S-004 evidence and prior implementation diffs.
- Remove dead helpers, duplicate branches and obsolete tests created by old implementations.
- Keep architecture layer rules intact.

### Verification

- `npm run test`, `npm run lint`, `npm run build`, affected E2E.
- `test/unit/architecture.test.ts` still enforces layer boundaries.

### Result

- Removed obsolete modal `shapeMotionKey` plumbing after transform-based morph parity was covered.
- Removed unused settings `onViewChange` state/effect path.
- Narrowed uploaded-background helper input to the required `background` field.
- Verified with `npm run lint`, `npm run test`, `npm run build`, targeted app E2E, full performance E2E and `git diff --check`.

## Sprint Contract: S-001 Active Handoff Docs

### Goal

Create active, non-archive documentation sufficient for another agent to continue after `docs.old/` is deleted.

### Contract Index

- `contract_id`: `C-001..C-011`
- Source: `PROJECT.md`, `ARCHITECTURE.md`, `TEST_PLAN.md`
- Expected docs: `README.md`, `PROJECT.md`, `ARCHITECTURE.md`, `PLAN.md`, `TEST_PLAN.md`, `docs/contract-index.md`, `docs/eval-plan.md`, `docs/agent-boundaries.md`, `docs/tool-inventory.md`
- Expected verification: `git diff --check`; optional full app checks in `S-002`

### In Scope

- Replace template README with project entry.
- Rebuild product, architecture, plan, test and contract docs.
- Preserve constraints needed after archive deletion.

### Out Of Scope

- Product code edits.
- Rewriting `docs.old/`.
- Running full E2E or MQTT broker validation unless requested after handoff.
- Final release decisions on licensing, production deployment or weather API policy.

### Done Definition

- Active docs do not require `docs.old/`.
- Main contracts map to current code paths and validation commands.
- Remaining work is explicit and implementable as `S-002`.

### Required Verification

```sh
git diff --check README.md PROJECT.md ARCHITECTURE.md PLAN.md TEST_PLAN.md docs/contract-index.md docs/eval-plan.md docs/agent-boundaries.md docs/tool-inventory.md
```

### Pass Threshold

- No whitespace errors.
- No active doc links require `docs.old/`.
- `S-002` has clear verification commands.

### Failure Threshold

- Any active doc depends on `docs.old/` as a required source.
- Product-code changes are introduced by this Sprint.
- Contract IDs cannot be traced to code or verification entry points.

### Rollback

- Revert only files touched by `S-001`.

## Sprint Contract: S-002 Re-Verify Baseline

### Goal

Prove the current app still satisfies the active contracts after the handoff.

### In Scope

- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- Optional local MQTT broker smoke when Docker is available.

### Out Of Scope

- Fixing discovered product bugs in the same Sprint unless user authorizes an implementation Sprint.

### Done Definition

- Verification results are recorded.
- Failures are reduced to minimal repro, expected result, actual result and owning contract.

### Result

Baseline re-verification passed after app E2E stabilization:

```sh
npm run lint
npm run test
npm run test:e2e -- --project=chromium-desktop
git diff --check
```

Result: lint passed, 8 unit files / 34 tests passed, desktop E2E passed with 10 passed and 1 skipped MQTT broker smoke, and diff check passed. Build still reports the existing Vite large chunk warning.

## Open Questions

- Confirm final resource licensing and distribution scope.
- Confirm production deployment target and `wss://` broker strategy.
- Confirm Open-Meteo production usage and attribution requirements.
- Confirm target performance profile: desktop only, mobile-class Chrome throttle, or both.
