# Animal-Crossing-Player Project

## One-Line Definition

Animal-Crossing-Player is a browser-based Animal Crossing ambience clock that plays time, weather and user-setting-aware music.

## Goals

- Show a minimal home surface: time, date, optional lunar date, weather and background.
- Keep complex controls in onboarding and settings.
- Select BGM by current hour, weather and selected game version.
- Preserve hourly flow: fade BGM, play town tune if configured, play bell strikes, start next-hour BGM.
- Support NookNet town tune import only.
- Support weather by browser Geolocation + Open-Meteo or a manually specified location, refreshing every 10 minutes after startup.
- Support browser MQTT remote control through MQTT over WebSocket.
- Persist settings, uploaded backgrounds and audio cache in browser storage.
- Install as a PWA with a web app manifest, install icons and Service Worker shell support.
- Support English and Simplified Chinese UI through `public/locales/<language>.json`.
- Reduce CPU/GPU cost without removing visible motion, modal shape effects or audio behavior.

## Non-Goals

- Do not recreate the old project architecture.
- Do not put playback controls, MQTT status, debug state or error panels on the home screen.
- Do not support native browser `mqtt://` or `mqtts://` TCP connections.
- Do not add a manual 16-note town tune editor.
- Do not require audio cache to exist before playback can work.
- Do not store MQTT credentials unless the user enables credential saving and confirms the plaintext browser-storage risk.

## Users And Scenarios

- User: someone who wants an Animal Crossing ambience clock in a browser.
- Scenario: open the app, finish or skip onboarding, let current time and weather choose the background music, adjust advanced settings only when needed.
- Success: the home screen stays quiet and readable while audio, weather, background and remote control work through existing settings flows.

## First-Version Scope

- Required: onboarding, minimal home, audio preparation and playback, town tune URL import, weather/time display, settings modal, browser persistence, MQTT over WebSocket, tests.
- Deferred: production deployment policy, final resource licensing review, Open-Meteo production usage and attribution policy.
- Forbidden expansion: native MQTT TCP in browser, server-side account system, home-screen player dashboard.

## Constraints

- Runtime: browser app built with React, Vite and TypeScript.
- UI: primary controls use `animal-island-ui`; local UI atoms live in `src/L4_Atom/ui`.
- Architecture: use `src/L1_Entry`, `src/L2_Core`, `src/L3_Business`, `src/L4_Atom`.
- Data: settings and user assets stay in browser storage; MQTT password never appears in state messages or logs.
- Integration: MQTT remote control is WebSocket-only; automatic weather uses Geolocation and Open-Meteo.
- Assets: `public/assets/audio.json` and asset directories are implementation facts; resource licensing remains a release blocker.

## Acceptance Criteria

- `npm run test`, `npm run lint`, `npm run build` pass before code handoff.
- UI changes that affect user flows pass relevant Playwright coverage or equivalent browser verification.
- Home screen only exposes allowed time/date/weather/background information.
- Onboarding can choose language, BGM version, town tune and initial audio loading.
- Startup after onboarding shows an audio prompt and waits for a user gesture before playback.
- Settings are modal-based and cover Audio, Island, Remote and App sections.
- MQTT accepts only `ws://` or `wss://`, maps commands through L2, publishes ACK/state without password leakage.
- Public behavior changes update `docs/contract-index.md`, relevant docs and tests.
- Performance refactors record before/after browser evidence and preserve observable visual/audio parity.

## Open Release Risks

- Resource authorization for bundled audio and images.
- Production HTTPS and `wss://` broker policy.
- Open-Meteo production usage, attribution and rate expectations.
- Final performance budgets need a measured baseline on the target desktop and mobile-class profiles.
