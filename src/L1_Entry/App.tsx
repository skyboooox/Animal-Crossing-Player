import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from './appContext';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingModal } from './onboarding/OnboardingModal';
import { StartupAudioModal } from './startup/StartupAudioModal';
import { AppIcon } from '../L4_Atom/ui/AppIcon';
import { Button, Loading, Modal } from '../L4_Atom/ui/animalIsland';
import type { ModalMotionOrigin } from '../L4_Atom/ui/animalIsland';
import { useUiText, type UiText } from './i18n';
import { incrementRenderCount } from './renderDiagnostics';

const SETTINGS_CLOSE_GUARD_MS = 220;
const EMPTY_WEATHER_VALUES: UiText['weather']['values'] = { Sunny: '', Rainy: '', Snowy: '' };
const EMPTY_STRING_DICT: Record<string, string> = {};

function getModalOrigin(element: HTMLElement): ModalMotionOrigin {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  const icon = element.querySelector<HTMLImageElement>('img');
  const label = element.textContent?.trim();

  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    borderRadius: style.borderRadius,
    backgroundColor: style.backgroundColor,
    boxShadow: style.boxShadow,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    color: style.color,
    iconSrc: icon?.currentSrc || icon?.src || undefined,
    label: label || undefined,
  };
}

export function App() {
  incrementRenderCount('App');
  const { state, loading, actions } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCloseGuard, setSettingsCloseGuard] = useState(false);
  const [settingsMotionOrigin, setSettingsMotionOrigin] = useState<ModalMotionOrigin | null>(null);
  const text = useUiText(state?.settings.language ?? 'en');
  const background = state?.settings.background;
  const hourCycle = state?.settings.time.hourCycle;
  const lunarEnabled = state?.settings.time.lunarEnabled;
  const language = state?.settings.language;
  const weather = state?.runtime.weather;
  const onOpenSettings = useCallback((element: HTMLElement) => {
    setSettingsCloseGuard(false);
    setSettingsMotionOrigin(getModalOrigin(element));
    setSettingsOpen(true);
  }, []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setSettingsCloseGuard(true);
  }, []);

  const homePageText = useMemo(
    () => ({
      aria: text?.home?.aria ?? '',
      openSettings: text?.home?.openSettings ?? '',
      high: text?.home?.high ?? '',
      low: text?.home?.low ?? '',
      weatherValues: text?.weather?.values ?? EMPTY_WEATHER_VALUES,
      weatherLocationLabels: text?.weather?.locationLabels ?? EMPTY_STRING_DICT,
    }),
    [text?.home?.aria, text?.home?.openSettings, text?.home?.high, text?.home?.low, text?.weather?.values, text?.weather?.locationLabels],
  );
  const homePageData = useMemo(
    () =>
      background && hourCycle && lunarEnabled !== undefined && language && weather
        ? {
            background,
            hourCycle,
            lunarEnabled,
            language,
            weather,
            text: homePageText,
          }
        : null,
    [
      background,
      hourCycle,
      lunarEnabled,
      language,
      weather,
      homePageText,
    ],
  );

  useEffect(() => {
    if (!settingsCloseGuard) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setSettingsCloseGuard(false);
    }, SETTINGS_CLOSE_GUARD_MS);

    return () => window.clearTimeout(timeout);
  }, [settingsCloseGuard]);

  if (loading || !state || !text) {
    return (
      <main className="app-shell" aria-busy="true" aria-label={text?.app.loadingAria}>
        <Loading active />
      </main>
    );
  }

  const onboardingOpen = !state.settings.onboardingCompleted && !settingsOpen && !settingsCloseGuard;
  const startupAudioOpen =
    state.settings.onboardingCompleted &&
    state.runtime.startupAudioPromptOpen &&
    state.runtime.audio.status !== 'playing' &&
    state.runtime.audio.status !== 'blocked' &&
    !settingsOpen &&
    !settingsCloseGuard;
  const homePageHideSettingsButton = onboardingOpen || startupAudioOpen || settingsOpen || settingsCloseGuard;
  if (!homePageData) {
    return (
      <main className="app-shell" aria-busy="true" aria-label={text?.app.loadingAria}>
        <Loading active />
      </main>
    );
  }

  return (
    <div className="app-shell">
      <HomePage
        background={homePageData.background}
        hourCycle={homePageData.hourCycle}
        lunarEnabled={homePageData.lunarEnabled}
        language={homePageData.language}
        weather={homePageData.weather}
        text={homePageData.text}
        onOpenSettings={onOpenSettings}
        hideSettingsButton={homePageHideSettingsButton}
      />
      <SettingsPage open={settingsOpen} motionOrigin={settingsMotionOrigin} state={state} text={text} actions={actions} onClose={closeSettings} />
      {onboardingOpen ? (
        <OnboardingModal state={state} text={text} actions={actions} onOpenSettings={onOpenSettings} />
      ) : null}
      <StartupAudioModal open={startupAudioOpen} state={state} text={text} actions={actions} />
      <Modal
        open={state.runtime.audio.status === 'blocked'}
        className="app-modal app-modal--permission"
        title={text.permission.title}
        typewriter={false}
        maskClosable={false}
        footer={
          <div className="modal-actions">
            <Button ghost type="primary" onClick={actions.dismissAudioBlock}>{text.permission.later}</Button>
            <Button icon={<AppIcon name="volume" size={16} />} type="primary" onClick={() => void actions.startAudio()}>
              {text.permission.enable}
            </Button>
          </div>
        }
      >
        <div className="app-modal-content">
          <p>{text.permission.body}</p>
        </div>
      </Modal>
    </div>
  );
}
