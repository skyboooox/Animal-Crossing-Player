# Animal-Crossing-Player Test Plan

## Required Commands

```sh
npm run test
npm run lint
npm run build
npm run test:e2e
```

For local MQTT manual or E2E validation:

```sh
docker compose -f docker-compose.mqtt.yml up -d
docker compose -f docker-compose.mqtt.yml down
```

MQTT E2E skips when the local broker is not running.

## Unit Coverage

| Area | Required checks | Entry |
| --- | --- | --- |
| Architecture | L4 does not import upper layers; MQTT command entry stays in L1 | `test/unit/architecture.test.ts` |
| App state | defaults, startup runtime, persistence-facing state changes | `test/unit/appState.test.ts` |
| Audio | manifest, BGM selection, weather fallback, next-hour behavior | `test/unit/audio.test.ts` |
| Town tune | NookNet URL parsing, invalid URL rejection, 16-token rules | `test/unit/townTune.test.ts` |
| Weather/time | Open-Meteo mapping, manual location fallback, time/lunar formatting | `test/unit/weatherTime.test.ts` |
| Settings remote | MQTT URL validation, command ACK/state safety | `test/unit/settingsRemote.test.ts` |
| i18n | English and Simplified Chinese key coverage | `test/unit/i18nLocales.test.ts` |
| Onboarding audio loading | automatic preparation and progress states | `test/unit/onboardingAudioLoading.test.tsx` |

## Browser Coverage

Use Playwright or equivalent browser verification for:

- First onboarding flow: language, BGM version, town tune, audio loading.
- Skip onboarding uses defaults and enters audio loading.
- Restart after onboarding shows startup audio prompt and waits for `Start`.
- Home screen shows only time, date, optional lunar date, weather and background.
- Production build exposes a web app manifest, install icons and a registered Service Worker.
- Settings opens as a modal launcher with Audio, Island, Remote and App sections.
- Settings content scrolls safely on mobile, tablet and desktop.
- Motion respects `prefers-reduced-motion`.
- Uploaded and preset backgrounds render without blocking home text.
- Locales hot-switch active UI text.
- Performance refactors preserve the same visible effects on desktop and mobile viewports.

Reference viewport set:

- Mobile: `390x844`
- Tablet: `768x1024`
- Desktop: `1440x900`

## MQTT Validation

Local broker:

```text
URL: ws://localhost:9001
Username: acplayer
Password: acplayer-dev
```

Required behavior:

- Browser settings reject `mqtt://` and `mqtts://`.
- `setVolume` updates state and ACKs `applied`.
- `requestState` publishes state without password.
- Unknown command returns rejected ACK.
- Manual location mode stores a location name and resolves real weather for that place; it does not directly select `Sunny`, `Rainy` or `Snowy`.
- Next-hour audio preload is always enabled and is not user-configurable.
- Auto weather location copy uses a readable place name or localized local fallback, never raw coordinates.
- Weather refreshes once after startup and then every 10 minutes while a refreshable weather mode is active.

## Performance Coverage

Baseline before optimization:

- Capture home idle with preset pan enabled for at least 10 seconds.
- Capture settings modal open, category switch and close.
- Capture onboarding page transition and audio-loading state.
- Capture town tune preview and hourly chime scheduling without audio errors.

Required evidence:

- Browser trace or Playwright/CDP metrics for main-thread work, frame cadence and paint/composite activity.
- React render evidence for `App`, `HomePage`, `SettingsPage`, `SettingsShell` and provider context consumers.
- Screenshot or computed-style evidence that visual effects remain active.
- Audio unit/E2E evidence that fades, preview and hourly flow still complete.

Pass threshold:

- No user-visible effect is removed or replaced by a static fallback except under `prefers-reduced-motion`.
- Optimized paths improve measured hot spots against the recorded baseline or document why the bottleneck moved outside application code.
- `npm run test`, `npm run lint`, `npm run build` pass; affected Playwright specs pass.

## Release Gates

- All required commands pass.
- Main Playwright flows pass.
- MQTT WebSocket smoke passes when broker is available.
- Resource authorization is confirmed.
- Production HTTPS and `wss://` strategy is confirmed.
- Open-Meteo production usage, attribution and rate expectations are confirmed.
