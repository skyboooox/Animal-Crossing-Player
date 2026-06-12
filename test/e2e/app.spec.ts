import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { AppSettings } from '../../src/L2_Core/types';

async function mustBox(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

async function expectHeightTransition(locator: Locator, enabled: boolean) {
  const motion = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: (element as HTMLElement).style.height,
      overflow: style.overflow,
      transitionDuration: style.transitionDuration,
      transitionProperty: style.transitionProperty,
    };
  });

  expect(motion.height).toMatch(/px$/);
  expect(motion.overflow).toBe('hidden');
  if (enabled) {
    expect(motion.transitionProperty).toContain('height');
    expect(motion.transitionDuration).not.toBe('0s');
  } else {
    expect(motion.transitionDuration).toBe('0s');
  }
}

async function expectSettingsSafeScroller(page: Page) {
  const metrics = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>('.app-modal--settings [class*="animal-modalClipped"]');
    const modal = document.querySelector<HTMLElement>('.settings-modal');
    const scroller = document.querySelector<HTMLElement>('.settings-motion-panel');
    if (!shell || !modal || !scroller) {
      return null;
    }

    const shellRect = shell.getBoundingClientRect();
    const modalRect = modal.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const content = scroller.querySelector<HTMLElement>('.animated-panel__content');
    const contentStyle = content ? getComputedStyle(content) : null;
    const scrollerStyle = getComputedStyle(scroller);
    return {
      contentPaddingBottom: contentStyle ? Number.parseFloat(contentStyle.paddingBottom) : 0,
      modalBottom: modalRect.bottom,
      modalHeight: modalRect.height,
      scrollerBottom: scrollerRect.bottom,
      scrollerHeight: scrollerRect.height,
      scrollerOverflow: scrollerStyle.overflowY,
      shellBottom: shellRect.bottom,
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics!.scrollerOverflow).toBe('auto');
  expect(metrics!.modalHeight).toBeGreaterThan(metrics!.scrollerHeight);
  expect(metrics!.scrollerBottom).toBeLessThanOrEqual(metrics!.modalBottom + 1);
  expect(metrics!.shellBottom - metrics!.scrollerBottom).toBeGreaterThanOrEqual(0);
  expect(metrics!.contentPaddingBottom).toBeGreaterThanOrEqual(32);
}

async function expectAudioSettingsBottomSafe(page: Page) {
  const metrics = await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>('.settings-motion-panel');
    if (!scroller) {
      return null;
    }

    scroller.scrollTop = scroller.scrollHeight;
    const scrollerRect = scroller.getBoundingClientRect();
    const buttons = Array.from(scroller.querySelectorAll('button')).map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        text: button.textContent?.trim().replace(/\s+/g, ' ') ?? '',
        top: rect.top,
      };
    });
    const cacheButton = buttons.find((button) => button.text.includes('Clear audio cache') || button.text.includes('清除音频缓存'));
    return {
      cacheButton,
      clientHeight: scroller.clientHeight,
      scrollHeight: scroller.scrollHeight,
      scrollTop: scroller.scrollTop,
      scrollerBottom: scrollerRect.bottom,
      scrollerTop: scrollerRect.top,
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics!.scrollHeight).toBeGreaterThan(metrics!.clientHeight);
  expect(metrics!.scrollTop).toBeGreaterThan(0);
  expect(metrics!.cacheButton).toBeTruthy();
  expect(metrics!.cacheButton!.top).toBeGreaterThanOrEqual(metrics!.scrollerTop);
  expect(metrics!.cacheButton!.bottom).toBeLessThanOrEqual(metrics!.scrollerBottom - 16);
}

async function expectSettingsButtonMorph(page: Page, enabled: boolean) {
  const modal = page.locator('.app-modal--settings');
  const morph = page.getByTestId('modal-button-morph');

  if (enabled) {
    await expect(morph).toBeVisible();
    const motion = await morph.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationName: style.animationName,
        fromX: Number.parseFloat(style.getPropertyValue('--app-morph-from-x')),
        fromY: Number.parseFloat(style.getPropertyValue('--app-morph-from-y')),
        fromWidth: Number.parseFloat(style.getPropertyValue('--app-morph-from-w')),
        fromHeight: Number.parseFloat(style.getPropertyValue('--app-morph-from-h')),
        midX: Number.parseFloat(style.getPropertyValue('--app-morph-mid-x')),
        midY: Number.parseFloat(style.getPropertyValue('--app-morph-mid-y')),
        toX: Number.parseFloat(style.getPropertyValue('--app-morph-to-x')),
        toY: Number.parseFloat(style.getPropertyValue('--app-morph-to-y')),
        toWidth: Number.parseFloat(style.getPropertyValue('--app-morph-to-w')),
        toHeight: Number.parseFloat(style.getPropertyValue('--app-morph-to-h')),
        fromScaleX: Number.parseFloat(style.getPropertyValue('--app-morph-from-scale-x')),
        fromScaleY: Number.parseFloat(style.getPropertyValue('--app-morph-from-scale-y')),
        fromTranslateX: Number.parseFloat(style.getPropertyValue('--app-morph-from-translate-x')),
        fromTranslateY: Number.parseFloat(style.getPropertyValue('--app-morph-from-translate-y')),
        willChange: style.willChange,
      };
    });
    const modalState = await modal.evaluate((element) => ({
      className: element.className,
      opacity: getComputedStyle(element).opacity,
    }));

    expect(motion.animationName).toContain('app-modal-button-morph');
    expect(motion.toWidth).toBeGreaterThan(motion.fromWidth * 2);
    expect(motion.toHeight).toBeGreaterThan(motion.fromHeight * 3);
    expect(motion.toWidth * motion.toHeight).toBeGreaterThan(motion.fromWidth * motion.fromHeight * 8);
    expect(motion.fromScaleX).toBeCloseTo(motion.fromWidth / motion.toWidth, 2);
    expect(motion.fromScaleY).toBeCloseTo(motion.fromHeight / motion.toHeight, 2);
    expect(Math.abs(motion.fromTranslateX - (motion.fromX - motion.toX))).toBeLessThanOrEqual(1);
    expect(Math.abs(motion.fromTranslateY - (motion.fromY - motion.toY))).toBeLessThanOrEqual(1);
    expect(motion.willChange).toContain('transform');
    expect(motion.willChange).not.toContain('left');
    const fromDistance = Math.hypot(
      motion.fromX + motion.fromWidth / 2 - (motion.toX + motion.toWidth / 2),
      motion.fromY + motion.fromHeight / 2 - (motion.toY + motion.toHeight / 2),
    );
    const midDistance = Math.hypot(
      motion.midX + motion.fromWidth / 2 - (motion.toX + motion.toWidth / 2),
      motion.midY + motion.fromHeight / 2 - (motion.toY + motion.toHeight / 2),
    );
    expect(midDistance).toBeLessThan(fromDistance);
    expect(midDistance).toBeLessThan(2);
    expect(modalState.className).toMatch(/app-modal--morph-hidden|app-modal--morph-ready/);
    expect(['0', '1']).toContain(modalState.opacity);
    let shapeState = {
      blobRadius: '',
      blobOpacity: 0,
      clipPath: '',
      maskImage: '',
      pillOpacity: 1,
    };
    if ((await morph.count()) > 0) {
      await expect
        .poll(async () => {
          if ((await morph.count()) === 0) {
            return true;
          }

          shapeState = await morph.evaluate((element) => {
            const blob = element.querySelector<HTMLElement>('.app-modal-morph__blob');
            const pill = element.querySelector<HTMLElement>('.app-modal-morph__pill');
            return {
              blobRadius: blob ? getComputedStyle(blob).borderRadius : '',
              blobOpacity: blob ? Number(getComputedStyle(blob).opacity) : 0,
              clipPath: blob ? getComputedStyle(blob).clipPath : '',
              maskImage: blob ? getComputedStyle(blob).getPropertyValue('-webkit-mask-image') || getComputedStyle(blob).maskImage : '',
              pillOpacity: pill ? Number(getComputedStyle(pill).opacity) : 1,
            };
          });
          return shapeState.blobOpacity > 0.2 && shapeState.pillOpacity < 0.9;
        })
        .toBe(true);
      expect(shapeState.blobRadius).not.toBe('0px');
      expect(shapeState.clipPath).toBe('none');
      expect(shapeState.maskImage).not.toBe('none');
    }
    await expect(modal).toHaveClass(/app-modal--morph-ready/);
    const readyModalState = await modal.evaluate((element) => ({
      animationName: getComputedStyle(element).animationName,
      opacity: getComputedStyle(element).opacity,
    }));
    expect(readyModalState.animationName).toBe('none');
    expect(readyModalState.opacity).toBe('1');
    await expect(morph).toHaveCount(0, { timeout: 1500 });
    return;
  }

  await expect(morph).toHaveCount(0);
  const motion = await modal.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      animationName: style.animationName,
      className: element.className,
    };
  });
  expect(motion.className).not.toContain('app-modal--morph-hidden');
  expect(motion.animationName).toBe('none');
}

async function expectModalOrganicShell(page: Page) {
  const shell = page.locator('.app-modal--settings [class*="animal-modalClipped"]');
  const shellState = await shell.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      clipPath: style.getPropertyValue('-webkit-clip-path') || style.clipPath,
      maskImage: style.getPropertyValue('-webkit-mask-image') || style.maskImage,
      overflow: style.overflow,
    };
  });
  expect(shellState.borderRadius).not.toBe('0px');
  expect(shellState.clipPath).toContain('app-modal-liquid-clip');
  expect(shellState.maskImage).toBe('none');
  expect(shellState.overflow).toBe('hidden');
}

async function expectModalLiquidClip(page: Page) {
  const modal = page.locator('.app-modal--settings');
  await expect(modal).toHaveClass(/app-modal--liquid-clip/);
  await expect(page.getByTestId('modal-liquid-edge')).toHaveCount(0);
  const pulseState = await modal.evaluate((element) => {
    const shell = element.querySelector<HTMLElement>('[class*="animal-modalClipped"]');
    const shellStyle = shell ? getComputedStyle(shell) : null;
    const clipAnimate = element.ownerDocument.querySelector('.app-liquid-defs animate');
    return {
      clipAnimateAttribute: clipAnimate?.getAttribute('attributeName') ?? '',
      clipPath: shellStyle?.getPropertyValue('-webkit-clip-path') || shellStyle?.clipPath || '',
      clipValues: clipAnimate?.getAttribute('values') ?? '',
      maskImage: shellStyle?.getPropertyValue('-webkit-mask-image') || shellStyle?.maskImage || '',
      overflow: shellStyle?.overflow ?? '',
    };
  });
  expect(pulseState.clipAnimateAttribute).toBe('d');
  expect(pulseState.clipPath).toContain('app-modal-liquid-clip');
  expect(pulseState.maskImage).toBe('none');
  expect(pulseState.overflow).toBe('hidden');
  expect(pulseState.clipValues).toContain('M0.05 0.36');
  expect(pulseState.clipValues).toContain('M0.034 0.374');
}

async function setRangeValue(locator: Locator, value: number) {
  await locator.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, String(nextValue));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

function createCompletedSettings(): AppSettings {
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
      clientId: 'acp-e2e-startup',
      username: '',
      password: '',
      saveCredentials: false,
      baseTopic: 'ac-player/v1/acp-e2e-startup',
      qos: 0,
      retainState: true,
      retainCommand: false,
    },
  };
}

test('home weather does not render cached coordinate labels', async ({ page }) => {
  const settings = createCompletedSettings();
  settings.weather = {
    mode: 'manual',
    manualValue: 'Sunny',
    manualLocationLabel: '',
    lastAuto: {
      value: 'Sunny',
      locationLabel: '22.30, 114.20',
      temperature: 26,
      temperatureMax: 29,
      temperatureMin: 23,
      weatherCode: 0,
      updatedAt: '2026-06-09T12:00:00.000Z',
      source: 'open-meteo',
    },
  };
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
    },
    { savedSettings: settings },
  );

  await page.goto('/');
  const homeWeather = page.locator('.home__weather');
  await expect(homeWeather).toBeVisible();
  await expect(homeWeather).toContainText('Local');
  await expect(homeWeather).not.toContainText('22.30');
  await expect(homeWeather).not.toContainText('114.20');
});

test('weather settings reveal manual location input only in manual mode', async ({ page }) => {
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
    },
    { savedSettings: createCompletedSettings() },
  );

  await page.goto('/');
  const start = page.getByRole('button', { name: 'Start', exact: true });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await page.getByRole('button', { name: /Display.*Weather, background, date and time/ }).click();

  const weatherSection = page.locator('.settings-section').filter({ hasText: 'Weather & Location' });
  await expect(weatherSection.locator('#manual-location')).toBeVisible();
  await expect(weatherSection.getByText('Manual weather', { exact: true })).toHaveCount(0);

  await weatherSection.getByText('Manual location', { exact: true }).click();
  await page.getByText('Auto location', { exact: true }).click();
  await expect(weatherSection.locator('#manual-location')).toHaveCount(0);

  await weatherSection.getByText('Auto location', { exact: true }).click();
  await page.getByText('Manual location', { exact: true }).click();
  await expect(weatherSection.locator('#manual-location')).toBeVisible();
  await expect(weatherSection.getByText('Manual weather', { exact: true })).toHaveCount(0);
});

test('weather refreshes every ten minutes after startup', async ({ page }) => {
  const settings = createCompletedSettings();
  settings.weather = {
    ...settings.weather,
    mode: 'auto',
    lastAuto: null,
  };
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition(success: PositionCallback) {
            success({
              coords: {
                latitude: 22.3,
                longitude: 114.2,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
                toJSON: () => ({}),
              },
              timestamp: Date.now(),
              toJSON: () => ({}),
            });
          },
        },
      });

      const originalFetch = window.fetch.bind(window);
      const browserWindow = window as Window & {
        __runWeatherRefreshInterval?: () => void;
        __weatherForecastRequests?: number;
        __weatherRefreshIntervalMs?: number;
      };
      browserWindow.__weatherForecastRequests = 0;
      const originalSetInterval = window.setInterval.bind(window);
      window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        if (timeout === 10 * 60 * 1000) {
          browserWindow.__weatherRefreshIntervalMs = timeout;
          browserWindow.__runWeatherRefreshInterval = () => {
            if (typeof handler === 'function') {
              handler(...args);
            }
          };
        }
        return originalSetInterval(handler, timeout, ...args);
      }) as typeof window.setInterval;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input instanceof Request ? new URL(input.url) : input instanceof URL ? input : new URL(String(input), window.location.href);
        if (url.hostname === 'api.open-meteo.com') {
          browserWindow.__weatherForecastRequests = (browserWindow.__weatherForecastRequests ?? 0) + 1;
          return new Response(
            JSON.stringify({
              timezone: 'Asia/Hong_Kong',
              current: { temperature_2m: 20 + browserWindow.__weatherForecastRequests, weather_code: 0, precipitation: 0, rain: 0, snowfall: 0 },
              daily: { temperature_2m_max: [29], temperature_2m_min: [23] },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (url.hostname === 'nominatim.openstreetmap.org') {
          return new Response(JSON.stringify({ address: { city: 'Hong Kong', country: 'China' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      };
    },
    { savedSettings: settings },
  );

  await page.goto('/');
  await expect(page.locator('.home__weather')).toContainText('Hong Kong');
  await expect.poll(() => page.evaluate(() => (window as Window & { __weatherForecastRequests?: number }).__weatherForecastRequests ?? 0)).toBe(1);
  expect(await page.evaluate(() => (window as Window & { __weatherRefreshIntervalMs?: number }).__weatherRefreshIntervalMs)).toBe(10 * 60 * 1000);

  await page.evaluate(() => (window as Window & { __runWeatherRefreshInterval?: () => void }).__runWeatherRefreshInterval?.());

  await expect.poll(() => page.evaluate(() => (window as Window & { __weatherForecastRequests?: number }).__weatherForecastRequests ?? 0)).toBe(2);
});

test('audio settings show reload after BGM version changes', async ({ page }) => {
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
    },
    { savedSettings: createCompletedSettings() },
  );

  await page.goto('/');
  const start = page.getByRole('button', { name: 'Start', exact: true });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();

  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await page.getByRole('button', { name: /Sound.*Playback, town tune, audio cache/ }).click();

  await expect(page.getByRole('button', { name: 'Reload', exact: true })).toHaveCount(0);
  await page.getByText('New Horizons (Switch 2021)', { exact: true }).click();
  await page.getByText('New Leaf (3DS 2012)', { exact: true }).click();

  const reload = page.getByRole('button', { name: 'Reload', exact: true });
  await expect(reload).toBeVisible();
  await reload.click();
  await expect(reload).toHaveCount(0, { timeout: 30_000 });
});

test('home, onboarding, settings, and audio loading are reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home__time')).toBeVisible();
  const homeBackground = page.getByTestId('home-background');
  await expect(homeBackground).toHaveClass(/home__background--pan/);
  const backgroundMotion = await homeBackground.evaluate((element) => ({
    angle: Number(element.getAttribute('data-pan-angle')),
    backgroundPosition: getComputedStyle(element).backgroundPosition,
    backgroundRepeat: getComputedStyle(element).backgroundRepeat,
    transform: getComputedStyle(element).transform,
  }));
  expect(backgroundMotion.angle).toBeGreaterThanOrEqual(0);
  expect(backgroundMotion.angle).toBeLessThan(360);
  expect(backgroundMotion.backgroundRepeat).toBe('repeat');
  await page.waitForTimeout(350);
  await expect
    .poll(() =>
      homeBackground.evaluate(
        (element, initial) => {
          const style = getComputedStyle(element);
          const activeAnimations = element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length;
          return style.backgroundPosition !== initial.backgroundPosition || style.transform !== initial.transform || activeAnimations > 0;
        },
        {
          backgroundPosition: backgroundMotion.backgroundPosition,
          transform: backgroundMotion.transform,
        },
      ),
    )
    .toBe(true);
  await page.waitForFunction(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px "Alimama FangYuanTi VF"', 'Island') && document.fonts.check('16px "Alimama FangYuanTi VF"', '设置');
  });
  const typography = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const time = getComputedStyle(document.querySelector('.home__time')!);
    return {
      rootFamily: root.fontFamily,
      timeFamily: time.fontFamily,
      timeNumeric: time.fontVariantNumeric,
      timeWeight: Number(time.fontWeight),
    };
  });
  expect(typography.rootFamily).toContain('Alimama FangYuanTi VF');
  expect(typography.timeFamily).toContain('Alimama FangYuanTi VF');
  expect(typography.timeNumeric).toContain('tabular-nums');
  expect(typography.timeWeight).toBeGreaterThanOrEqual(800);

  const dialog = page.getByRole('dialog');
  await expect(dialog).not.toContainText('Island setup');
  await expect(dialog).toContainText('Language');
  await expectHeightTransition(page.locator('.onboarding-motion-panel'), true);
  await expect(page.getByRole('button', { name: 'Open settings', exact: true })).toHaveCount(0);

  const pageActions = page.getByRole('toolbar', { name: 'Onboarding page actions', exact: true });
  const skip = pageActions.getByRole('button', { name: 'Skip', exact: true });
  const settings = pageActions.getByRole('button', { name: 'Settings', exact: true });
  const next = page.getByRole('button', { name: 'Continue', exact: true });
  await expect(settings.locator('.app-icon[src$="hammer-and-wrench.svg"]')).toHaveCount(1);
  await expect(skip.locator('.app-icon')).toHaveCount(0);
  await expect(next.locator('.app-icon')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Skip', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const dialogBox = await mustBox(dialog);
  const onboardingCentering = await page.evaluate(() => {
    const currentDialog = document.querySelector('[role="dialog"]');
    const onboardingBody = document.querySelector('.onboarding-body');
    if (!currentDialog || !onboardingBody) {
      return null;
    }
    const dialogRect = currentDialog.getBoundingClientRect();
    const contentRect = onboardingBody.getBoundingClientRect();
    return Math.abs(dialogRect.left + dialogRect.width / 2 - (contentRect.left + contentRect.width / 2));
  });
  expect(onboardingCentering).not.toBeNull();
  expect(onboardingCentering!).toBeLessThan(3);
  const skipBox = await mustBox(skip);
  const settingsBox = await mustBox(settings);
  const nextBox = await mustBox(next);
  expect(skipBox.x).toBeLessThan(40);
  expect(skipBox.y).toBeLessThan(40);
  expect(settingsBox.x + settingsBox.width).toBeGreaterThan(viewport!.width - 40);
  expect(settingsBox.y).toBeLessThan(40);
  expect(nextBox.x).toBeGreaterThan(dialogBox.x + dialogBox.width * 0.55);
  expect(nextBox.y).toBeGreaterThan(dialogBox.y + dialogBox.height * 0.55);
  const onboardingButtonMetrics = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.onboarding-page-actions button, .onboarding-footer button')).map((button) => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        className: button.className,
        color: style.color,
        height: Math.round(rect.height),
        fontWeight: Number(style.fontWeight),
      };
    }),
  );
  expect(onboardingButtonMetrics).toHaveLength(3);
  expect(new Set(onboardingButtonMetrics.map((metric) => metric.borderRadius)).size).toBe(1);
  expect(new Set(onboardingButtonMetrics.map((metric) => metric.height)).size).toBe(1);
  expect(new Set(onboardingButtonMetrics.map((metric) => metric.backgroundColor)).size).toBeGreaterThan(1);
  expect(onboardingButtonMetrics.filter((metric) => metric.className.includes('ghost'))).toHaveLength(1);
  expect(onboardingButtonMetrics.filter((metric) => !metric.className.includes('ghost'))).toHaveLength(2);
  const onboardingPrimaryMetrics = onboardingButtonMetrics.filter((metric) => !metric.className.includes('ghost'));
  expect(new Set(onboardingPrimaryMetrics.map((metric) => metric.backgroundColor)).size).toBe(1);
  expect(onboardingPrimaryMetrics[0].backgroundColor).not.toBe('rgb(32, 198, 185)');
  for (const metric of onboardingButtonMetrics) {
    expect(metric.className).toContain('animal-btn');
    expect(metric.className).toContain('primary');
    if (!metric.className.includes('ghost')) {
      expect(metric.boxShadow).not.toBe('none');
    }
    expect(metric.color).not.toBe('');
    expect(metric.fontWeight).toBeGreaterThanOrEqual(600);
  }

  await page.getByRole('radio', { name: '简体中文', exact: true }).click();
  await expect(dialog).not.toContainText('岛屿设置');
  await expect(dialog).toContainText('语言');
  await expect(page.getByRole('button', { name: '继续', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await expect(dialog).not.toContainText('Island setup');
  await expect(dialog).toContainText('Language');

  await next.click();
  await expect(dialog).toContainText('BGM Version');
  await expect(dialog.getByRole('button', { name: 'Back', exact: true }).locator('.app-icon')).toHaveCount(0);
  const onboardingFooterButtons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.onboarding-footer button')).map((button) => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        className: button.className,
        color: style.color,
        height: Math.round(rect.height),
        width: Math.round(rect.width),
      };
    }),
  );
  expect(onboardingFooterButtons).toHaveLength(2);
  expect(onboardingFooterButtons[0].className).toContain('onboarding-nav-button');
  expect(onboardingFooterButtons[1].className).toContain('onboarding-nav-button');
  expect(onboardingFooterButtons[0].className).toContain('primary');
  expect(onboardingFooterButtons[1].className).toContain('primary');
  expect(onboardingFooterButtons[0].className).toContain('ghost');
  expect(onboardingFooterButtons[1].className).not.toContain('ghost');
  expect(onboardingFooterButtons[0].borderRadius).toBe(onboardingFooterButtons[1].borderRadius);
  expect(onboardingFooterButtons[0].boxShadow).toBe('none');
  expect(onboardingFooterButtons[1].boxShadow).not.toBe('none');
  expect(onboardingFooterButtons[0].height).toBe(onboardingFooterButtons[1].height);
  expect(onboardingFooterButtons[0].width).toBe(onboardingFooterButtons[1].width);
  expect(onboardingFooterButtons[0].backgroundColor).not.toBe(onboardingFooterButtons[1].backgroundColor);
  expect(onboardingFooterButtons[0].color).not.toBe(onboardingFooterButtons[1].color);
  await expectHeightTransition(page.locator('.onboarding-motion-panel'), true);
  const bgmLayout = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.choice-radio--bgm label')).map((option) => {
      const rect = option.getBoundingClientRect();
      return { x: Math.round(rect.x), y: Math.round(rect.y) };
    }),
  );
  expect(bgmLayout).toHaveLength(4);
  expect(new Set(bgmLayout.map((box) => box.x)).size).toBe(2);
  expect(new Set(bgmLayout.map((box) => box.y)).size).toBe(2);

  await settings.click();
  await expectSettingsButtonMorph(page, true);
  await expectModalOrganicShell(page);
  await expect(dialog).toContainText('Settings');
  await expect(page.locator('.settings-header .game-heading--page')).toHaveText('Settings');
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toHaveText('×');
  await expect(page.getByRole('navigation', { name: 'Settings launcher', exact: true })).toBeVisible();
  await expect(page.locator('.settings-launcher__icon .app-icon')).toHaveCount(4);
  await expectSettingsSafeScroller(page);
  const closeButtonBox = await mustBox(page.getByRole('button', { name: 'Close', exact: true }));
  expect(closeButtonBox.x).toBeLessThanOrEqual(20);
  expect(closeButtonBox.y).toBeLessThanOrEqual(20);
  const settingsCentering = await page.evaluate(() => {
    const currentDialog = document.querySelector('[role="dialog"]');
    const settingsModal = document.querySelector('.settings-modal');
    if (!currentDialog || !settingsModal) {
      return null;
    }
    const dialogRect = currentDialog.getBoundingClientRect();
    const contentRect = settingsModal.getBoundingClientRect();
    return Math.abs(dialogRect.left + dialogRect.width / 2 - (contentRect.left + contentRect.width / 2));
  });
  expect(settingsCentering).not.toBeNull();
  expect(settingsCentering!).toBeLessThan(3);
  await expect(page.getByRole('button', { name: /Sound.*Playback, town tune, audio cache/ })).toBeVisible();
  await page.getByRole('button', { name: /Sound.*Playback, town tune, audio cache/ }).click();
  await expectModalLiquidClip(page);
  await expect(page.getByText('BGM version')).toBeVisible();
  await expect(page.getByText('Hourly chime')).toBeVisible();
  await expect(page.getByText('Preload next hour')).toHaveCount(0);
  await expect(page.getByText('Fade ms')).toHaveCount(0);
  await expectSettingsSafeScroller(page);
  await expectAudioSettingsBottomSafe(page);
  await expect(page.locator('.settings-section .game-heading--section').first()).toHaveText('Playback');
  await expect(page.locator('.settings-actions .app-icon')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back', exact: true }).locator('.app-icon')).toHaveCount(0);
  const settingsNavMetrics = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.settings-actions .settings-nav-button')).map((button) => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: Number.parseFloat(style.borderTopLeftRadius),
        boxShadow: style.boxShadow,
        className: button.className,
        color: style.color,
        height: rect.height,
        width: rect.width,
      };
    }),
  );
  expect(settingsNavMetrics).toHaveLength(1);
  for (const metric of settingsNavMetrics) {
    expect(metric.width).toBeLessThanOrEqual(130);
    expect(metric.height).toBeLessThanOrEqual(48);
    expect(metric.borderRadius).toBeGreaterThanOrEqual(18);
    expect(metric.className).toContain('animal-btn');
    expect(metric.className).toContain('primary');
    if (!metric.className.includes('ghost')) {
      expect(metric.boxShadow).not.toBe('none');
    }
  }
  expect(settingsNavMetrics[0].className).not.toContain('ghost');
  const bgmSelectTrigger = page.locator('.settings-section [class*="animal-trigger"]').first();
  const triggerBox = await mustBox(bgmSelectTrigger);
  await bgmSelectTrigger.click();
  const dropdown = page.locator('.settings-section [class*="animal-dropdown"]');
  await expect(dropdown).toBeVisible();
  const dropdownBox = await mustBox(dropdown);
  const openDialogBox = await mustBox(dialog);
  expect(dropdownBox.width).toBeLessThan(triggerBox.width - 4);
  expect(dropdownBox.x).toBeGreaterThanOrEqual(Math.max(0, openDialogBox.x) - 1);
  expect(dropdownBox.x + dropdownBox.width).toBeLessThanOrEqual(Math.min(viewport!.width, openDialogBox.x + openDialogBox.width) + 1);
  await page.getByRole('button', { name: 'Back', exact: true }).click();

  await page.getByRole('button', { name: /System.*Language, maintenance/ }).click();
  await expect(page.getByText('Application language')).toBeVisible();
  await page.locator('.settings-section').getByText('English', { exact: true }).click();
  await page.locator('.settings-section').getByText('简体中文', { exact: true }).click();
  await expect(page.getByText('应用语言')).toBeVisible();
  await expect(page.getByRole('button', { name: '返回', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '关闭', exact: true })).toHaveText('×');
  await page.locator('.settings-section').getByText('简体中文', { exact: true }).click();
  await page.locator('.settings-section').getByText('English', { exact: true }).click();
  await expect(page.getByText('Application language')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toHaveText('×');
  await page.getByRole('button', { name: 'Back', exact: true }).click();

  await page.getByRole('button', { name: /Display.*Weather, background, date and time/ }).click();
  const dateTimeSection = page.locator('.settings-section').filter({ hasText: 'Date & Time' });
  await expect(dateTimeSection.getByText('24-hour time')).toBeVisible();
  const backgroundSection = page.locator('.settings-section').filter({ hasText: 'Background' });
  await expect(backgroundSection.getByText('Background type')).toBeVisible();
  await expect(backgroundSection.getByText('Background color')).toHaveCount(0);
  await expect(backgroundSection.locator('.background-grid')).toBeVisible();
  const presetPanRow = backgroundSection.locator('.range-row').filter({ hasText: 'Background pan' });
  await expect(presetPanRow).toBeVisible();
  await presetPanRow.click();
  await expect(page.getByTestId('home-background')).not.toHaveClass(/home__background--pan/);
  await presetPanRow.click();
  await expect(page.getByTestId('home-background')).toHaveClass(/home__background--pan/);
  await expect(backgroundSection.getByRole('button', { name: 'Upload', exact: true })).toHaveCount(0);

  const backgroundKind = backgroundSection.locator('[class*="animal-trigger"]').first();
  await backgroundKind.click();
  await page.getByText('Solid', { exact: true }).click();
  await expect(backgroundSection.getByText('Background color')).toBeVisible();
  await expect(backgroundSection.locator('.background-grid')).toHaveCount(0);
  await expect(backgroundSection.getByText('Background pan')).toHaveCount(0);
  await expect(backgroundSection.getByRole('button', { name: 'Upload', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('home-background')).not.toHaveClass(/home__background--pan/);

  await backgroundKind.click();
  await page.getByText('Uploaded image', { exact: true }).click();
  await expect(backgroundSection.getByText('Background color')).toHaveCount(0);
  await expect(backgroundSection.locator('.background-grid')).toHaveCount(0);
  await expect(backgroundSection.getByText('Background pan')).toHaveCount(0);
  await expect(backgroundSection.getByRole('button', { name: 'Upload', exact: true })).toBeVisible();
  await expect(backgroundSection.getByRole('button', { name: 'Clear uploaded background', exact: true })).toBeVisible();
  await expect(page.getByTestId('home-background')).not.toHaveClass(/home__background--pan/);
  await page.getByRole('button', { name: 'Back', exact: true }).click();

  await page.getByRole('button', { name: /Remote control.*MQTT connection and remote logs/ }).click();
  await expect(page.getByRole('main', { name: 'Remote control settings', exact: true })).toBeVisible();
  await expect(page.getByText('MQTT Connection')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Settings section' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.waitForTimeout(80);
  await expect(page.locator('.app-modal--settings')).toHaveClass(/app-modal--closing/);
  await expect(page.getByText('Island setup')).toHaveCount(0);
  const closingSettingsState = await page.locator('.app-modal--settings').evaluate((element) => {
    const shell = element.querySelector<HTMLElement>('[class*="animal-modalClipped"]');
    const style = shell ? getComputedStyle(shell) : null;
    return {
      clipPath: style?.getPropertyValue('-webkit-clip-path') || style?.clipPath || '',
      defsCount: element.ownerDocument.querySelectorAll('.app-liquid-defs').length,
      maskImage: style?.getPropertyValue('-webkit-mask-image') || style?.maskImage || '',
    };
  });
  expect(closingSettingsState.clipPath).toContain('app-modal-liquid-clip');
  expect(closingSettingsState.defsCount).toBeGreaterThan(0);
  expect(closingSettingsState.maskImage).toBe('none');

  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByText(/Audio Loading/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
});

test('onboarding controls stay clear of the organic modal clip at tablet width', async ({ page }) => {
  await page.setViewportSize({ width: 764, height: 805 });
  await page.goto('/');
  const dialog = page.getByRole('dialog');
  await expect(dialog).not.toContainText('Island setup');
  await expect(dialog).toContainText('Language');

  const safeLayout = await page.evaluate(() => {
    const rectOf = (element: Element | null) => {
      const rect = element?.getBoundingClientRect();
      return rect
        ? {
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            width: rect.width,
          }
        : null;
    };
    const shell = rectOf(document.querySelector('.app-modal--onboarding [class*="animal-modalClipped"]'));
    const labels = Array.from(document.querySelectorAll('.choice-radio--languages label')).map(rectOf).filter(Boolean);
    const next = rectOf(Array.from(document.querySelectorAll('.app-modal--onboarding button')).find((button) => button.textContent?.trim() === 'Continue') ?? null);

    return {
      labels,
      next,
      shell,
    };
  });

  expect(safeLayout.shell).not.toBeNull();
  expect(safeLayout.next).not.toBeNull();
  expect(safeLayout.labels).toHaveLength(2);

  const shell = safeLayout.shell!;
  const safeLeft = shell.left + shell.width * 0.1;
  const safeRight = shell.right - shell.width * 0.1;
  const safeBottom = shell.top + shell.width * 0.42;
  const labelLeft = Math.min(...safeLayout.labels.map((label) => label!.left));
  const labelRight = Math.max(...safeLayout.labels.map((label) => label!.right));

  expect(labelLeft).toBeGreaterThanOrEqual(safeLeft);
  expect(labelRight).toBeLessThanOrEqual(safeRight);
  expect(safeLayout.next!.right).toBeLessThanOrEqual(safeRight);
  expect(safeLayout.next!.bottom).toBeLessThanOrEqual(safeBottom);

  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(dialog).toContainText('Town Tune');
  await expect(dialog.getByRole('button', { name: 'Back', exact: true }).locator('.app-icon')).toHaveCount(0);
  const townTunePreview = dialog.getByRole('button', { name: 'Preview', exact: true });
  const townTuneClear = dialog.getByRole('button', { name: 'Clear', exact: true });
  const townTuneSkip = dialog.getByRole('button', { name: 'Skip town tune', exact: true });
  await expect(townTunePreview).toBeDisabled();
  await expect(townTuneClear).toBeDisabled();
  await expect(townTuneSkip).toBeEnabled();
  await expect(townTunePreview).toHaveClass(/animal-btn-primary/);
  await expect(townTuneClear).toHaveClass(/animal-btn-primary/);
  await expect(townTuneClear).toHaveClass(/animal-btn-danger/);
  await expect(townTuneSkip).toHaveClass(/animal-btn-primary/);
  await expect(townTuneSkip).toHaveClass(/animal-btn-ghost/);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const body = document.querySelector('.onboarding-body--town-tune')?.getBoundingClientRect();
        const footer = document.querySelector('.onboarding-footer')?.getBoundingClientRect();
        return Boolean(body && footer && body.bottom <= footer.top);
      }),
    )
    .toBe(true);

  const townTuneSafeLayout = await page.evaluate(() => {
    const rectOf = (element: Element | null) => {
      const rect = element?.getBoundingClientRect();
      return rect
        ? {
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            top: rect.top,
            width: rect.width,
          }
        : null;
    };
    const shell = rectOf(document.querySelector('.app-modal--onboarding [class*="animal-modalClipped"]'));
    const body = rectOf(document.querySelector('.onboarding-body--town-tune'));
    const controls = [
      document.querySelector('.field-row'),
      document.querySelector('.note-preview'),
      document.querySelector('.step-actions'),
    ].map(rectOf).filter(Boolean);
    const footer = rectOf(document.querySelector('.onboarding-footer'));

    return {
      body,
      controls,
      footer,
      shell,
    };
  });

  expect(townTuneSafeLayout.shell).not.toBeNull();
  expect(townTuneSafeLayout.body).not.toBeNull();
  expect(townTuneSafeLayout.footer).not.toBeNull();
  expect(townTuneSafeLayout.controls.length).toBeGreaterThanOrEqual(3);

  const townTuneShell = townTuneSafeLayout.shell!;
  const townTuneSafeLeft = townTuneShell.left + townTuneShell.width * 0.1;
  const townTuneSafeRight = townTuneShell.right - townTuneShell.width * 0.1;
  const townTuneSafeBottom = townTuneShell.bottom - townTuneShell.width * 0.03;

  for (const control of townTuneSafeLayout.controls) {
    expect(control!.left).toBeGreaterThanOrEqual(townTuneSafeLeft);
    expect(control!.right).toBeLessThanOrEqual(townTuneSafeRight);
  }
  expect(townTuneSafeLayout.body!.bottom).toBeLessThanOrEqual(townTuneSafeLayout.footer!.top);
  expect(townTuneSafeLayout.footer!.left).toBeGreaterThanOrEqual(townTuneSafeLeft);
  expect(townTuneSafeLayout.footer!.right).toBeLessThanOrEqual(townTuneSafeRight);
  expect(townTuneSafeLayout.footer!.bottom).toBeLessThanOrEqual(townTuneSafeBottom);
});

test('completed onboarding opens startup audio modal before playback', async ({ page }) => {
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
    },
    { savedSettings: createCompletedSettings() },
  );

  await page.goto('/');
  await expect(page.locator('.home__time')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open settings', exact: true })).toHaveCount(0);

  const dialog = page.getByRole('dialog');
  await expect(dialog).not.toContainText('Start island radio');
  await expect(dialog).toContainText('Loading audio');
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);

  const start = page.getByRole('button', { name: 'Start', exact: true });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await expect(start.locator('.app-icon')).toHaveCount(0);
  await start.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open settings', exact: true })).toBeVisible();
});

test('settings audio panel keeps bottom controls inside the safe scroll area', async ({ page }) => {
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
    },
    { savedSettings: createCompletedSettings() },
  );

  await page.goto('/');
  const start = page.getByRole('button', { name: 'Start', exact: true });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Settings launcher', exact: true })).toBeVisible();
  await expectSettingsSafeScroller(page);

  await page.getByRole('button', { name: /Sound.*Playback, town tune, audio cache/ }).click();
  await expect(page.getByText('NookNet URL')).toBeVisible();
  await expectSettingsSafeScroller(page);
  await expectAudioSettingsBottomSafe(page);
});

test('audio volume sliders update active Web Audio gains immediately', async ({ page }) => {
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));

      const browserWindow = window as Window & {
        __acpAudioGains?: GainNode[];
        webkitAudioContext?: typeof AudioContext;
      };
      browserWindow.__acpAudioGains = [];

      const patchAudioContext = (Ctor: typeof AudioContext | undefined) => {
        if (!Ctor) {
          return;
        }
        const prototype = Ctor.prototype as AudioContext & { __acpGainProbePatched?: boolean };
        if (prototype.__acpGainProbePatched) {
          return;
        }
        const createGain = prototype.createGain;
        prototype.createGain = function createGainProbe(this: AudioContext) {
          const gain = createGain.call(this);
          browserWindow.__acpAudioGains?.push(gain);
          return gain;
        };
        prototype.__acpGainProbePatched = true;
      };

      patchAudioContext(window.AudioContext);
      patchAudioContext(browserWindow.webkitAudioContext);
    },
    { savedSettings: createCompletedSettings() },
  );

  await page.goto('/');
  const start = page.getByRole('button', { name: 'Start', exact: true });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();
  await expect(page.getByRole('button', { name: 'Open settings', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __acpAudioGains?: GainNode[] }).__acpAudioGains?.[0]?.gain.value ?? null))
    .toBeCloseTo(0.2, 2);

  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await expectSettingsButtonMorph(page, true);
  await page.getByRole('button', { name: /Sound.*Playback, town tune, audio cache/ }).click();

  const bgmSlider = page.locator('label.range-row').filter({ hasText: 'BGM volume' }).locator('input');
  await setRangeValue(bgmSlider, 0.64);
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __acpAudioGains?: GainNode[] }).__acpAudioGains?.[0]?.gain.value ?? null))
    .toBeCloseTo(0.64, 2);

  await page.locator('#settings-town-tune').fill('https://nooknet.net/tunes?melody=g-g-g-g-g-g-g-g-g-g-g-g-g-g-g-g&title=Live%20Volume');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __acpAudioGains?: GainNode[] }).__acpAudioGains?.[0]?.gain.value ?? null))
    .toBeLessThan(0.64);
  await expect.poll(() => page.evaluate(() => (window as Window & { __acpAudioGains?: GainNode[] }).__acpAudioGains?.length ?? 0)).toBeGreaterThan(1);
  const townTuneSlider = page.locator('label.range-row').filter({ hasText: 'Town tune volume' }).locator('input');
  await setRangeValue(townTuneSlider, 0.37);
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __acpAudioGains?: GainNode[] }).__acpAudioGains?.[1]?.gain.value ?? null))
    .toBeCloseTo(0.37, 2);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __acpAudioGains?: GainNode[] }).__acpAudioGains?.[0]?.gain.value ?? null))
    .toBeCloseTo(0.64, 2);
});

test('app settings can enter first setup again', async ({ page }) => {
  const settings = createCompletedSettings();
  settings.language = 'zh-CN';
  await page.addInitScript(
    ({ savedSettings }) => {
      localStorage.setItem('animal-crossing-player.settings.v1', JSON.stringify(savedSettings));
    },
    { savedSettings: settings },
  );

  await page.goto('/');
  const start = page.getByRole('button', { name: '开始', exact: true });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();
  await page.getByRole('button', { name: '打开设置', exact: true }).click();
  await expect(page.getByRole('navigation', { name: '设置启动台', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /系统.*语言/ }).click();

  await expect(page.getByText('首次设置已完成')).toHaveCount(0);
  const languageSection = page.locator('.settings-section').filter({ hasText: '语言' });
  const maintenanceSection = page.locator('.settings-section').filter({ hasText: '维护和测试' });
  await expect(languageSection.getByRole('button', { name: '进入首次设置', exact: true })).toHaveCount(0);
  await expect(maintenanceSection.getByRole('button', { name: '进入首次设置', exact: true })).toBeVisible();
  await expect(maintenanceSection.getByRole('button', { name: '测试整点报时', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '进入首次设置', exact: true }).click();
  await expect(page.getByRole('dialog').filter({ hasText: '语言' })).toBeVisible();
  await expect(page.getByRole('dialog')).not.toContainText('岛屿设置');
  await expect(page.getByRole('button', { name: '继续', exact: true })).toBeVisible();
});
