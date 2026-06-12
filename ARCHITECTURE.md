# Animal-Crossing-Player Architecture

## Direction

The project uses the repository four-layer standard. The goal is shallow debugging and centralized workflow control: UI and MQTT events enter L1, business flow decisions live in L2, domain operations live in L3, and platform or library details stay in L4.

```text
src/L1_Entry      external inputs, React views, adapters
src/L2_Core       app workflows, state transitions, effects routing
src/L3_Business   domain capabilities
src/L4_Atom       platform, third-party and small reusable atoms
```

## Dependency Rules

```text
L1_Entry -> L2_Core
L1_Entry -> L4_Atom/ui
L2_Core -> L3_Business
L2_Core -> L4_Atom
L3_Business -> L4_Atom
L4_Atom -> platform / third-party
```

Forbidden:

- L4 importing L1, L2 or L3.
- L3 owning global app state.
- L3 horizontal imports unless L2 explicitly composes the flow.
- React components directly owning Web Audio, CacheStorage, IndexedDB, MQTT publish or Open-Meteo workflow decisions.
- MQTT commands bypassing L2 state handling.

## L1 Entry

Responsibilities:

- React app entry, providers, routes, pages, onboarding and settings.
- Browser and MQTT command adapters.
- Parse user input and call L2 actions.
- Render state from L2.

Key paths:

- `src/L1_Entry/main.tsx`
- `src/L1_Entry/App.tsx`
- `src/L1_Entry/providers.tsx`
- `src/L1_Entry/pages/HomePage.tsx`
- `src/L1_Entry/onboarding/`
- `src/L1_Entry/settings/`
- `src/L1_Entry/adapters/mqttCommandEntry.ts`

## L2 Core

Responsibilities:

- App state, startup, onboarding, settings, audio, weather, background and remote-control workflows.
- Cross-domain decisions, retries, error handling and effect routing.
- Single place where UI events and MQTT commands become application behavior.

Key paths:

- `src/L2_Core/appState.ts`
- `src/L2_Core/startupCore.ts`
- `src/L2_Core/onboardingCore.ts`
- `src/L2_Core/settingsCore.ts`
- `src/L2_Core/audioCore.ts`
- `src/L2_Core/weatherCore.ts`
- `src/L2_Core/backgroundCore.ts`
- `src/L2_Core/remoteControlCore.ts`
- `src/L2_Core/errorCore.ts`

## L3 Business

Responsibilities:

- BGM selection and initial audio load planning.
- Hourly flow planning helpers.
- NookNet town tune parsing.
- Weather mapping.
- Time, date and lunar formatting.
- Settings defaults, import/export and sensitive-field sanitization.
- Background resolution.

Key paths:

- `src/L3_Business/audio/`
- `src/L3_Business/townTune/`
- `src/L3_Business/weather/`
- `src/L3_Business/time/`
- `src/L3_Business/settings/`
- `src/L3_Business/background/`

## L4 Atom

Responsibilities:

- Web Audio primitive operations.
- Audio manifest loading.
- CacheStorage, IndexedDB, OPFS and localStorage wrappers.
- MQTT.js client and JSON validation primitives.
- Open-Meteo, Geolocation, lunar conversion, URL and ID utilities.
- UI atom wrappers around `animal-island-ui` and local visual assets.

Key paths:

- `src/L4_Atom/audio/`
- `src/L4_Atom/assetManifest/`
- `src/L4_Atom/storage/`
- `src/L4_Atom/mqtt/`
- `src/L4_Atom/weatherApi/`
- `src/L4_Atom/date/`
- `src/L4_Atom/ui/`
- `src/L4_Atom/utils/`

## Main Flows

Startup:

1. L1 initializes providers and loads settings/manifest.
2. L2 creates app state and decides onboarding or startup audio prompt.
3. L1 renders onboarding, home and settings from L2 state.
4. Audio only starts after a user gesture.

Audio:

1. L1 requests prepare/start.
2. L2 plans and executes load/play workflow.
3. L3 selects tracks and load items.
4. L4 fetches, caches, decodes and plays audio.

MQTT:

1. L4 MQTT client receives bytes.
2. L1 adapter parses command entry.
3. L2 validates and maps command to state/effect.
4. L4 publishes ACK/state/error.

Debugging:

1. Check L2 workflow and state transitions first.
2. If the workflow is correct, inspect the responsible L3 capability.
3. If the domain output is correct, inspect the L4 platform wrapper.

## Performance Refactor Direction

- Measure first. Browser paint, long-task, frame and React render evidence must exist before changing effects.
- Preserve effects. Background pan, modal morph/liquid shape, onboarding/settings transitions, audio fade, town tune and hourly bell flow remain observable.
- Keep decisions centralized. Performance controllers may be split out of `src/L1_Entry/providers.tsx`, but audio, weather, MQTT and settings decisions still route through L2.
- Prefer compositor-safe motion for continuous visuals. Home background pan should avoid per-frame `background-position` writes when an equivalent transform-based layer can preserve the effect.
- Keep reusable UI motion atoms in `src/L4_Atom/ui`; keep page-specific orchestration in L1.
- Do not introduce a production dependency for performance until profiling proves local code cannot solve the measured bottleneck.
