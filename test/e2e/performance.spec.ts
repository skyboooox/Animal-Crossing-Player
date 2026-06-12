import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

type MetricMap = Record<string, number>;

interface TestSettings {
  schemaVersion: 1;
  language: 'en' | 'zh-CN';
  onboardingCompleted: boolean;
  bgmVersion: string;
  weather: {
    mode: 'auto' | 'manual';
    manualValue: string;
    manualLocationLabel: string;
    lastAuto: null;
  };
  audio: {
    bgmVolume: number;
    townTuneVolume: number;
    hourlyFlowEnabled: boolean;
    preloadNextHour: boolean;
    cacheEnabled: boolean;
    fadeMs: number;
  };
  townTune: {
    url: string | null;
    title: string | null;
    notes: string[];
  };
  time: {
    hourCycle: '12h' | '24h';
    lunarEnabled: boolean;
  };
  background: {
    kind: 'preset' | 'solid' | 'uploaded';
    solidColor: string;
    presetId: string;
    uploadedImageId: string | null;
    readabilityOverlay: boolean;
    presetPanEnabled: boolean;
  };
  mqtt: {
    enabled: boolean;
    url: string;
    clientId: string;
    username: string;
    password: string;
    saveCredentials: boolean;
    baseTopic: string;
    qos: 0 | 1;
    retainState: boolean;
    retainCommand: boolean;
  };
}

interface CaptureSample {
  t: number;
  targetVisible: boolean;
  runningAnimations: number;
  transform: string;
  animationName: string;
  backgroundPosition: string;
  transitionDuration: string;
  opacity: string;
}

interface WindowCaptureSummary {
  targetSelector: string;
  startedAt: number;
  durationMs: number;
  frameCount: number;
  sampleCount: number;
  targetVisibleSamples: number;
  styleMutationCount: number;
  motionSignatureCount: number;
  motionChanged: boolean;
  observedTransformOrAnimation: boolean;
  maxRunningAnimations: number;
  paintSamples: Array<{ name: string; startTime: number; duration: number }>;
}

interface BrowserWindowCaptureState {
  targetSelector: string;
  startedAt: number;
  stopAt: number;
  frameCount: number;
  samples: CaptureSample[];
  styleMutationCount: number;
  paintSamples: Array<{ name: string; startTime: number; duration: number }>;
  paintObserver: PerformanceObserver;
  observer: PerformanceObserver;
  styleObserver: MutationObserver | null;
  observedStyleTarget: Element | null;
}

interface TraceSummary {
  eventCount: number;
  topEvents: Array<{ name: string; count: number }>;
  warning?: string;
}

interface ScenarioSummary {
  scenario: string;
  captureMs: number;
  window: WindowCaptureSummary;
  cdp: {
    before: MetricMap;
    after: MetricMap;
    delta: MetricMap;
  };
  trace?: TraceSummary;
}

function createSettings(overrides: Partial<TestSettings> = {}): TestSettings {
  return {
    schemaVersion: 1,
    language: 'en',
    onboardingCompleted: true,
    bgmVersion: 'New Horizons (Switch 2021)',
    weather: {
      mode: 'manual',
      manualValue: 'Sunny',
      manualLocationLabel: '',
      lastAuto: null,
    },
    audio: {
      bgmVolume: 0.2,
      townTuneVolume: 0.2,
      hourlyFlowEnabled: true,
      preloadNextHour: true,
      cacheEnabled: false,
      fadeMs: 1800,
    },
    townTune: {
      url: null,
      title: null,
      notes: [],
    },
    time: {
      hourCycle: '24h',
      lunarEnabled: false,
    },
    background: {
      kind: 'preset',
      solidColor: '#E8F6EF',
      presetId: '0',
      uploadedImageId: null,
      readabilityOverlay: true,
      presetPanEnabled: true,
    },
    mqtt: {
      enabled: false,
      url: 'ws://localhost:9001',
      clientId: 'acp-e2e-perf',
      username: '',
      password: '',
      saveCredentials: false,
      baseTopic: 'ac-player/v1/acp-e2e-perf',
      qos: 0,
      retainState: true,
      retainCommand: false,
    },
    ...overrides,
  };
}

function sanitizeScenarioName(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function toMetricMap(before: MetricMap, after: MetricMap): MetricMap {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Object.fromEntries(Array.from(names).map((name) => [name, (after[name] ?? 0) - (before[name] ?? 0)]));
}

async function startWindowCapture(page: Page, durationMs: number, targetSelector: string): Promise<void> {
  await page.evaluate((payload) => {
    const { durationMs: captureDuration, targetSelector: selector } = payload as { durationMs: number; targetSelector: string };
    const existingCapture = (window as Window & { __acpPerfCapture?: BrowserWindowCaptureState }).__acpPerfCapture;
    if (existingCapture?.observer) {
      existingCapture.observer.disconnect();
    }

    performance.clearMarks('acp-capture-start');
    performance.clearMarks('acp-capture-end');
    performance.clearMeasures('acp-capture-window');

    const paintSamples: Array<{ name: string; startTime: number; duration: number }> = [];
    const samples: CaptureSample[] = [];
    const stopAt = performance.now() + captureDuration;

    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          paintSamples.push({
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      }
    });

    const state: BrowserWindowCaptureState = {
      targetSelector: selector,
      startedAt: performance.now(),
      stopAt,
      frameCount: 0,
      samples,
      styleMutationCount: 0,
      paintSamples,
      paintObserver,
      observer: paintObserver,
      styleObserver: null,
      observedStyleTarget: null,
    };

    try {
      paintObserver.observe({ type: 'paint', buffered: true });
    } catch {
      // PaintTiming support varies; CDP metrics and frame samples remain the hard evidence.
    }

    const collect = () => {
      const now = performance.now();
      if (now >= stopAt) {
        return;
      }

      state.frameCount += 1;

      const target = document.querySelector<HTMLElement>(selector);
      if (target) {
        if (state.observedStyleTarget !== target) {
          state.styleObserver?.disconnect();
          state.observedStyleTarget = target;
          state.styleObserver = new MutationObserver((mutations) => {
            state.styleMutationCount += mutations.filter((mutation) => mutation.attributeName === 'style').length;
          });
          state.styleObserver.observe(target, { attributes: true, attributeFilter: ['style'] });
        }

        const style = getComputedStyle(target);
        const runningAnimations = target.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length;
        samples.push({
          t: now,
          targetVisible: true,
          runningAnimations,
          transform: style.transform,
          animationName: style.animationName,
          backgroundPosition: style.backgroundPosition,
          transitionDuration: style.transitionDuration,
          opacity: style.opacity,
        });
      } else {
        samples.push({
          t: now,
          targetVisible: false,
          runningAnimations: 0,
          transform: 'missing',
          animationName: '',
          backgroundPosition: '',
          transitionDuration: '',
          opacity: 'missing',
        });
      }

      requestAnimationFrame(collect);
    };

    (window as Window & { __acpPerfCapture?: BrowserWindowCaptureState }).__acpPerfCapture = state;

    requestAnimationFrame(collect);
    performance.mark('acp-capture-start');
  }, { durationMs, targetSelector });
}

async function stopWindowCapture(page: Page): Promise<WindowCaptureSummary | null> {
  return page.evaluate(() => {
    const state = (window as Window & { __acpPerfCapture?: BrowserWindowCaptureState }).__acpPerfCapture;
    if (!state) {
      return null;
    }

    state.observer?.disconnect?.();
    if (state.paintObserver?.disconnect) {
      state.paintObserver.disconnect();
    }
    state.styleObserver?.disconnect?.();

    performance.mark('acp-capture-end');
    performance.measure('acp-capture-window', 'acp-capture-start', 'acp-capture-end');

    const samples: CaptureSample[] = state.samples ?? [];
    const paintSamples: Array<{ name: string; startTime: number; duration: number }> = state.paintSamples ?? [];
    const signatures = new Set<string>();
    let lastSignature = '';
    let motionChanged = false;
    let observedTransformOrAnimation = false;
    let targetVisibleSamples = 0;
    let maxRunningAnimations = 0;

    for (const sample of samples) {
      const signature = `${sample.backgroundPosition}|${sample.transform}|${sample.animationName}|${sample.opacity}`;
      signatures.add(signature);
      if (lastSignature && signature !== lastSignature) {
        motionChanged = true;
      }
      lastSignature = signature;
      if (sample.targetVisible) {
        targetVisibleSamples += 1;
      }
      if (sample.runningAnimations > 0) {
        observedTransformOrAnimation = true;
      }
      if (sample.runningAnimations > maxRunningAnimations) {
        maxRunningAnimations = sample.runningAnimations;
      }
      if (sample.transform !== 'none' && sample.transform !== 'missing') {
        observedTransformOrAnimation = true;
      }
      if (sample.animationName && sample.animationName !== 'none' && sample.animationName !== 'none,none') {
        observedTransformOrAnimation = true;
      }
    }

    const measure = performance.getEntriesByName('acp-capture-window').slice(-1)[0] as PerformanceMeasure | undefined;
    const durationMs = measure?.duration ?? 0;

    delete (window as Window & { __acpPerfCapture?: unknown }).__acpPerfCapture;

    return {
      targetSelector: state.targetSelector,
      startedAt: state.startedAt,
      durationMs,
      frameCount: state.frameCount ?? samples.length,
      sampleCount: samples.length,
      targetVisibleSamples,
      styleMutationCount: state.styleMutationCount,
      motionSignatureCount: signatures.size,
      motionChanged,
      observedTransformOrAnimation,
      maxRunningAnimations,
      paintSamples,
    };
  });
}

type CdpSession = {
  send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  detach: () => Promise<void>;
};

async function getCdpMetrics(session: CdpSession): Promise<MetricMap> {
  const response = await session.send('Performance.getMetrics');
  const metrics = (response.metrics as Array<{ name: string; value: number }> | undefined) ?? [];
  return Object.fromEntries(
    metrics
      .filter((metric): metric is { name: string; value: number } => typeof metric.name === 'string' && typeof metric.value === 'number')
      .map((metric) => [metric.name, metric.value]),
  );
}

async function runPerformanceScenario(
  page: Page,
  testInfo: TestInfo,
  scenario: string,
  targetSelector: string,
  captureMs: number,
  action: () => Promise<void>,
) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  const cdpSession = (await page.context().newCDPSession(page)) as unknown as CdpSession;
  await cdpSession.send('Performance.enable');
  const before = await getCdpMetrics(cdpSession);

  await startWindowCapture(page, captureMs, targetSelector);
  await action();
  await page.waitForTimeout(captureMs);

  const windowCapture = await stopWindowCapture(page);
  const after = await getCdpMetrics(cdpSession);

  await cdpSession.detach().catch(() => {});

  const summary: ScenarioSummary = {
    scenario,
    captureMs,
    window: windowCapture ?? {
      targetSelector,
      startedAt: 0,
      durationMs: 0,
      frameCount: 0,
      sampleCount: 0,
      targetVisibleSamples: 0,
      styleMutationCount: 0,
      motionSignatureCount: 0,
      motionChanged: false,
      observedTransformOrAnimation: false,
      maxRunningAnimations: 0,
      paintSamples: [],
    },
    cdp: {
      before,
      after,
      delta: toMetricMap(before, after),
    },
    trace: {
      eventCount: 0,
      topEvents: [],
      warning: 'Trace not collected by this smoke spec; use Playwright trace or a dedicated CDP tracing runner for deep paint analysis.',
    },
  };

  const summaryPath = testInfo.outputPath(`${sanitizeScenarioName(scenario)}-summary.json`);
  await writeFile(summaryPath, JSON.stringify(summary, null, 2));
  await testInfo.attach(`${sanitizeScenarioName(scenario)}-summary.json`, {
    path: summaryPath,
    contentType: 'application/json',
  });

  return summary;
}

async function getWindowRenderCount(page: Page, componentName: string): Promise<number> {
  return page.evaluate((name) => {
    const win = window as Window & { __acpRenderCounts?: Record<string, number> };
    return win.__acpRenderCounts?.[name] ?? 0;
  }, componentName);
}

async function resetWindowRenderCounts(page: Page): Promise<void> {
  await page.evaluate(() => {
    const win = window as Window & { __acpRenderCounts?: Record<string, number> };
    win.__acpRenderCounts = {};
  });
}

async function installFastAudioProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const win = window as Window & {
      __acpFastAudioProbeInstalled?: boolean;
      webkitAudioContext?: typeof AudioContext;
    };

    if (win.__acpFastAudioProbeInstalled) {
      return;
    }

    win.__acpFastAudioProbeInstalled = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const rawUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      const path = new URL(rawUrl, window.location.href).pathname;
      if (path.endsWith('.mp3')) {
        return new Response(new Uint8Array([0]).buffer, {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg' },
        });
      }

      return originalFetch(input as RequestInfo | URL, init);
    };

    const patchAudioContext = (Ctor: typeof AudioContext | undefined) => {
      if (!Ctor) {
        return;
      }

      const prototype = Ctor.prototype as AudioContext & { __acpFastAudioDecodePatched?: boolean };
      if (prototype.__acpFastAudioDecodePatched) {
        return;
      }

      prototype.decodeAudioData = function decodeAudioDataProbe(
        this: AudioContext,
        _audioData: ArrayBuffer,
        successCallback?: DecodeSuccessCallback | null,
      ) {
        const buffer = this.createBuffer(1, 1, 44_100);
        successCallback?.(buffer);
        return Promise.resolve(buffer);
      } as AudioContext['decodeAudioData'];
      prototype.__acpFastAudioDecodePatched = true;
    };

    patchAudioContext(window.AudioContext);
    patchAudioContext(win.webkitAudioContext);
  });
}

async function dismissStartupAudioIfPresent(page: Page): Promise<void> {
  const startButton = page.getByRole('button', { name: /Start|开始/, exact: false }).first();
  if (!(await startButton.isVisible({ timeout: 1000 }).catch(() => false))) {
    return;
  }

  await expect(startButton).toBeEnabled({ timeout: 30_000 });
  await startButton.click();
  await expect(page.getByRole('button', { name: /Open settings|打开设置/, exact: false }).first()).toBeVisible({ timeout: 10_000 });
}

async function setRangeValue(locator: Locator, value: number): Promise<void> {
  await locator.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, String(nextValue));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function openSettings(page: Page): Promise<void> {
  const modal = page.locator('.app-modal--settings');
  if ((await modal.count()) > 0) {
    await expect(modal).toBeVisible({ timeout: 10_000 });
    return;
  }

  const toolbarSettingsButton = page.getByRole('toolbar', { name: /Onboarding page actions|Onboarding page actions/i }).getByRole('button', { name: /Settings|设置/ });
  const onboardingSettingsButton = page.locator('.onboarding-page-actions button');
  const candidates = [
    page.getByRole('button', { name: /Open settings|Settings|打开设置|设置/, exact: false }),
    toolbarSettingsButton,
    onboardingSettingsButton.filter({ hasText: /settings|设置/ }),
    onboardingSettingsButton.nth(1),
  ];

  for (const candidate of candidates) {
    try {
      await expect(candidate.first()).toBeVisible({ timeout: 5_000 });
      await candidate.first().click();
      await expect(modal).toBeVisible({ timeout: 10_000 });
      return;
    } catch {
      // Try the next known entry point.
    }
  }

  throw new Error('Unable to locate settings button');
}

test('performance baseline: home idle preset pan', async ({ page }, testInfo) => {
  await installFastAudioProbe(page);
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
    },
    { savedSettings: createSettings() },
  );

  await page.goto('/');
  await dismissStartupAudioIfPresent(page);
  const homeBackground = page.locator('.home__background[data-testid="home-background"]');
  await expect(page.locator('.home__time')).toBeVisible();
  await expect(homeBackground).toHaveClass(/home__background--pan/);

  const angle = await homeBackground.getAttribute('data-pan-angle');
  expect(angle).not.toBeNull();

  const summary = await runPerformanceScenario(
    page,
    testInfo,
    'home idle preset pan',
    '[data-testid="home-background"]',
    1400,
    async () => {
      await expect(homeBackground).toBeVisible();
      await page.waitForTimeout(240);
    },
  );

  expect(summary.window.targetVisibleSamples).toBeGreaterThan(0);
  expect(summary.window.sampleCount).toBeGreaterThan(10);
  expect(summary.window.motionChanged || summary.window.observedTransformOrAnimation).toBe(true);
  expect(summary.cdp.delta).toBeDefined();
});

test('performance baseline: settings modal open, switch category, and close', async ({ page }, testInfo) => {
  await installFastAudioProbe(page);
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
    },
    { savedSettings: createSettings() },
  );

  await page.goto('/');
  await expect(page.locator('.home__time')).toBeVisible();
  await dismissStartupAudioIfPresent(page);

  await openSettings(page);

  const summary = await runPerformanceScenario(
    page,
    testInfo,
    'settings modal open switch close',
    '.app-modal--settings',
    1700,
    async () => {
      await openSettings(page);

      const modal = page.locator('.app-modal--settings');
      await expect(modal).toBeVisible();
      const categoryTiles = modal.locator('.settings-launcher__button');
      await expect(categoryTiles.first()).toBeVisible();

      await categoryTiles.first().click();
      await expect(page.locator('.settings-panel')).toBeVisible();
      await modal.locator('.settings-nav-button--back').click();

      const tileCount = await categoryTiles.count();
      if (tileCount > 1) {
        await categoryTiles.nth(1).click();
        await expect(page.locator('.settings-panel')).toBeVisible();
      }

      await expect(page.locator('.settings-nav-button--back')).toBeVisible();
      await expect(page.locator('.settings-panel')).toBeVisible();
      await page.locator('.settings-nav-button--close').click();
      await expect(modal).toHaveClass(/app-modal--closing/, { timeout: 1500 });
      await expect(modal).toHaveCount(0, { timeout: 2200 });
    },
  );

  expect(summary.window.motionChanged || summary.window.observedTransformOrAnimation).toBe(true);
  expect(summary.window.frameCount).toBeGreaterThan(6);
  expect(Object.keys(summary.cdp.delta).length).toBeGreaterThan(0);
});

test('provider render: audio slider updates should not amplify HomePage renders', async ({ page }, testInfo) => {
  await installFastAudioProbe(page);
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
      (window as Window & { __acpRenderCounts?: Record<string, number> }).__acpRenderCounts = {};
    },
    { savedSettings: createSettings() },
  );

  await page.goto('/');
  await expect(page.locator('.home__time')).toBeVisible();
  await dismissStartupAudioIfPresent(page);

  await openSettings(page);

  const modal = page.locator('.app-modal--settings');
  await expect(modal).toBeVisible();
  const categoryTiles = modal.locator('.settings-launcher__button');
  await expect(categoryTiles.first()).toBeVisible();
  await categoryTiles.first().click();
  await expect(modal.locator('.settings-panel')).toBeVisible();
  const firstSlider = modal.locator('.settings-panel .range-row input[type="range"]').first();
  await expect(firstSlider).toBeVisible();

  await resetWindowRenderCounts(page);
  const trackedComponents = ['App', 'HomePage', 'SettingsPage', 'SettingsShell'];
  const renderBefore = Object.fromEntries(
    await Promise.all(trackedComponents.map(async (component) => [component, await getWindowRenderCount(page, component)] as const)),
  );

  await setRangeValue(firstSlider, 0.8);
  await page.waitForTimeout(250);

  const renderAfter = Object.fromEntries(
    await Promise.all(trackedComponents.map(async (component) => [component, await getWindowRenderCount(page, component)] as const)),
  );
  const renderDelta = Object.fromEntries(trackedComponents.map((component) => [component, renderAfter[component] - renderBefore[component]]));
  const summaryPath = testInfo.outputPath('provider-render-summary.json');
  await writeFile(summaryPath, JSON.stringify({ renderBefore, renderAfter, renderDelta }, null, 2));
  await testInfo.attach('provider-render-summary.json', {
    path: summaryPath,
    contentType: 'application/json',
  });
  expect(renderDelta.HomePage).toBeLessThanOrEqual(2);

  const closeSettings = page.locator('.settings-nav-button--close');
  await expect(closeSettings).toBeVisible();
  await closeSettings.click();
});

test('performance baseline: onboarding transition and startup audio loading state', async ({ page }, testInfo) => {
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
    },
    { savedSettings: createSettings({ onboardingCompleted: false }) },
  );

  await page.goto('/');

  const onboardingSummary = await runPerformanceScenario(
    page,
    testInfo,
    'onboarding transition',
    '.app-modal--onboarding .animated-panel__content',
    1500,
    async () => {
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('Language');
      const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
      await expect(continueButton).toBeVisible();
      await continueButton.click();
      await expect(dialog).toContainText('BGM Version', { timeout: 10_000 });
    },
  );

  expect(
    onboardingSummary.window.motionChanged ||
      onboardingSummary.window.observedTransformOrAnimation ||
      onboardingSummary.window.maxRunningAnimations > 0,
  ).toBe(true);
  expect(onboardingSummary.window.targetVisibleSamples).toBeGreaterThan(0);

  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
    },
    { savedSettings: createSettings() },
  );

  await page.goto('/');
  const startupSummary = await runPerformanceScenario(
    page,
    testInfo,
    'startup loading state',
    '[role="dialog"] .startup-audio',
    1400,
    async () => {
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText(/Loading audio/i);
      await expect(dialog.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
      const status = page.locator('.startup-audio p');
      await expect(status).toBeVisible();
      await page.waitForTimeout(250);
      const loadingText = await status.textContent();
      expect(loadingText).not.toBeNull();
      const secondReading = await status.textContent();
      expect(secondReading).not.toBeNull();
    },
  );

  expect(startupSummary.window.targetVisibleSamples).toBeGreaterThan(0);
  expect(startupSummary.window.sampleCount).toBeGreaterThan(5);
});
