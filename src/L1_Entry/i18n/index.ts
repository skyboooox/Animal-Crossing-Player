import type { IslandWeather, Language } from '../../L2_Core/types';
import { LANGUAGES } from '../../L2_Core/types';
import { isCoordinateLocationLabel } from '../../L4_Atom/weatherApi/reverseGeocoding';
import { useEffect, useState } from 'react';

type CategoryText = {
  label: string;
  description: string;
};

type TextRecord<T extends string> = Record<T, string>;

export interface UiText {
  app: {
    loadingAria: string;
  };
  common: {
    settings: string;
    home: string;
    back: string;
    skip: string;
    start: string;
    clear: string;
    close: string;
    preview: string;
    stop: string;
    upload: string;
    continue: string;
    townTuneNotes: string;
  };
  home: {
    aria: string;
    openSettings: string;
    high: string;
    low: string;
  };
  weather: {
    values: TextRecord<IslandWeather>;
    locationLabels: Record<string, string>;
  };
  errors: Record<string, string>;
  onboarding: {
    title: string;
    pageActionsAria: string;
    language: {
      title: string;
    };
    bgm: {
      title: string;
      choicesAria: string;
    };
    townTune: {
      title: string;
      url: string;
      noTune: string;
      skip: string;
    };
    audio: {
      title: string;
      progress: string;
      waiting: string;
      starting: string;
      ready: string;
    };
  };
  permission: {
    title: string;
    later: string;
    enable: string;
    body: string;
  };
  startupAudio: {
    loadingTitle: string;
  };
  settings: {
    modalAria: string;
    launcherAria: string;
    panelAriaSuffix: string;
    categories: {
      Audio: CategoryText;
      Island: CategoryText;
      Remote: CategoryText;
      App: CategoryText;
    };
    sections: Record<string, string>;
    audio: {
      bgmVersion: string;
      bgmVolume: string;
      townTuneVolume: string;
      hourlyFlow: string;
      nookNetUrl: string;
      noTownTune: string;
      cacheAudio: string;
      cacheCurrentSet: string;
      clearAudioCache: string;
      reloadAudio: string;
    };
    island: {
      kind: string;
      solid: string;
      preset: string;
      uploaded: string;
      solidColor: string;
      presetBackground: string;
      clearUploadedBackground: string;
      readabilityOverlay: string;
      presetPan: string;
      hourCycle: string;
      lunarDate: string;
      mode: string;
      autoLocation: string;
      manual: string;
      manualLocationLabel: string;
      refreshWeather: string;
      current: string;
    };
    remote: {
      noMessages: string;
      enableRemoteControl: string;
      webSocketUrl: string;
      clientId: string;
      username: string;
      password: string;
      saveCredentials: string;
      saveCredentialsConfirm: string;
      baseTopic: string;
      retainState: string;
      testConnection: string;
      clearMqttConfig: string;
      status: string;
      invalidUrl: string;
      statuses: Record<string, string>;
    };
    appPanel: {
      exportSettings: string;
      importSettings: string;
      clearLocalSettings: string;
      triggerHourlyChime: string;
      settingsFiles: string;
      testTools: string;
      localData: string;
      recentErrors: string;
      exportPasswordConfirm: string;
      importPasswordConfirm: string;
      clearLocalSettingsConfirm: string;
      noRecentErrors: string;
      applicationLanguage: string;
      enterOnboarding: string;
      errorScopes: Record<string, string>;
    };
  };
}

export interface LanguageOption {
  key: Language;
  label: string;
  locale: string;
}

const LANGUAGE_META: Record<Language, { label: string; locale: string }> = {
  en: { label: 'English', locale: 'en-US' },
  'zh-CN': { label: '简体中文', locale: 'zh-CN' },
};

const textCache: Partial<Record<Language, UiText>> = {};
let preloadPromise: Promise<void> | null = null;

function localePath(language: Language): string {
  return `/locales/${language}.json`;
}

export async function loadUiText(language: Language, fetcher: typeof fetch = fetch): Promise<UiText> {
  const cached = textCache[language];
  if (cached) {
    return cached;
  }

  const response = await fetcher(localePath(language));
  if (!response.ok) {
    throw new Error(`Failed to load locale ${language}: ${response.status}`);
  }

  const text = (await response.json()) as UiText;
  textCache[language] = text;
  return text;
}

export async function preloadUiText(fetcher: typeof fetch = fetch): Promise<void> {
  preloadPromise ??= Promise.all(LANGUAGES.map((language) => loadUiText(language, fetcher))).then(() => undefined);
  await preloadPromise;
}

export function useUiText(language: Language): UiText | null {
  const [, updateVersion] = useState(0);

  useEffect(() => {
    let active = true;
    void preloadUiText()
      .then(() => {
        if (active) {
          updateVersion((version) => version + 1);
        }
      })
      .catch(() => {
        if (active) {
          updateVersion((version) => version + 1);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (textCache[language]) {
      return undefined;
    }

    let active = true;
    void loadUiText(language)
      .then(() => {
        if (active) {
          updateVersion((version) => version + 1);
        }
      })
      .catch(() => {
        if (active) {
          updateVersion((version) => version + 1);
        }
      });

    return () => {
      active = false;
    };
  }, [language]);

  return textCache[language] ?? textCache.en ?? null;
}

export function getLanguageOptions(): LanguageOption[] {
  return LANGUAGES.map((key) => ({ key, ...LANGUAGE_META[key] }));
}

export function toSupportedLanguage(value: string): Language {
  return LANGUAGES.includes(value as Language) ? (value as Language) : 'en';
}

export function getLocale(language: Language): string {
  return LANGUAGE_META[language]?.locale ?? LANGUAGE_META.en.locale;
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)), template);
}

export function formatWeatherName(text: UiText, weather: IslandWeather): string {
  return text.weather.values[weather] ?? weather;
}

export function formatLocationLabelValue(labels: Record<string, string>, label: string): string {
  const translated = labels[label] ?? label;
  return isCoordinateLocationLabel(translated) ? (labels.Local ?? 'Local') : translated;
}

export function formatLocationLabel(text: UiText, label: string): string {
  return formatLocationLabelValue(text.weather.locationLabels, label);
}

export function formatErrorMessage(text: UiText, message: string): string {
  return text.errors[message] ?? message;
}
