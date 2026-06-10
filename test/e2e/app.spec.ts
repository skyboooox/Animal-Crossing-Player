import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

async function mustBox(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

function createCompletedSettings() {
  return {
    schemaVersion: 1,
    language: 'en',
    onboardingCompleted: true,
    bgmVersion: 'New Horizons (Switch 2021)',
    weather: {
      mode: 'manual',
      manualValue: 'Sunny',
      manualLocationLabel: 'E2E Island',
      lastAuto: null,
    },
    audio: {
      bgmVolume: 0.2,
      townTuneVolume: 0.2,
      hourlyFlowEnabled: true,
      preloadNextHour: false,
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
    },
    display: {
      motion: 'full',
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

test('home, onboarding, settings, and audio loading are reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.home__time')).toBeVisible();
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
  await expect(dialog).toContainText('Island setup');
  await expect(page.getByRole('button', { name: 'Open settings', exact: true })).toHaveCount(0);

  const pageActions = page.getByRole('toolbar', { name: 'Onboarding page actions', exact: true });
  const skip = pageActions.getByRole('button', { name: 'Skip', exact: true });
  const settings = pageActions.getByRole('button', { name: 'Settings', exact: true });
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await expect(settings.locator('.app-icon[src$="hammer-and-wrench.svg"]')).toHaveCount(1);
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

  await page.getByRole('radio', { name: '简体中文', exact: true }).click();
  await expect(dialog).toContainText('岛屿设置');
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'English', exact: true }).click();
  await expect(dialog).toContainText('Island setup');

  await next.click();
  await expect(dialog).toContainText('BGM Version');
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
  await expect(dialog).toContainText('Settings');
  await expect(page.locator('.settings-header .game-heading--page')).toHaveText('Settings');
  await expect(page.getByRole('navigation', { name: 'Settings launcher', exact: true })).toBeVisible();
  await expect(page.locator('.settings-launcher__icon .app-icon')).toHaveCount(4);
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
  await expect(page.getByRole('button', { name: /Audio.*Playback, town tune, audio cache/ })).toBeVisible();
  await page.getByRole('button', { name: /Audio.*Playback, town tune, audio cache/ }).click();
  await expect(page.getByText('BGM version')).toBeVisible();
  await expect(page.locator('.settings-section .game-heading--section').first()).toHaveText('Playback');
  await expect(page.locator('.settings-actions .app-icon')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Settings', exact: true }).locator('.app-icon[src$="hammer-and-wrench.svg"]')).toHaveCount(1);
  const settingsNavMetrics = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.settings-actions .settings-nav-button')).map((button) => {
      const rect = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return {
        borderRadius: Number.parseFloat(style.borderTopLeftRadius),
        boxShadow: style.boxShadow,
        height: rect.height,
        width: rect.width,
      };
    }),
  );
  expect(settingsNavMetrics).toHaveLength(2);
  for (const metric of settingsNavMetrics) {
    expect(metric.width).toBeLessThanOrEqual(130);
    expect(metric.height).toBeLessThanOrEqual(48);
    expect(metric.borderRadius).toBeGreaterThanOrEqual(18);
    expect(metric.boxShadow).not.toBe('none');
  }
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
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  await page.getByRole('button', { name: /App.*Language, display, maintenance/ }).click();
  await expect(page.getByText('Application language')).toBeVisible();
  await page.locator('.settings-section').getByText('English', { exact: true }).click();
  await page.locator('.settings-section').getByText('简体中文', { exact: true }).click();
  await expect(page.getByText('应用语言')).toBeVisible();
  await expect(page.getByRole('button', { name: '首页', exact: true })).toBeVisible();
  await page.locator('.settings-section').getByText('简体中文', { exact: true }).click();
  await page.locator('.settings-section').getByText('English', { exact: true }).click();
  await expect(page.getByText('Application language')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  await page.getByRole('button', { name: /Remote.*MQTT connection and remote log/ }).click();
  await expect(page.getByRole('main', { name: 'Remote settings', exact: true })).toBeVisible();
  await expect(page.getByText('MQTT Connection')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Settings section' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Home', exact: true }).click();

  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByText(/Audio Loading/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
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
  await expect(dialog).toContainText('Start island radio');
  await expect(dialog).toContainText('Audio Loading');
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);

  const start = page.getByRole('button', { name: 'Start', exact: true });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open settings', exact: true })).toBeVisible();
});
