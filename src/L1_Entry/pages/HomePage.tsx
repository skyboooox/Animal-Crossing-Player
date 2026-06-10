import { useEffect, useMemo, useState } from 'react';
import type { AppState } from '../../L2_Core/types';
import { createUploadedBackgroundUrl, resolveBackground } from '../../L2_Core/backgroundCore';
import { formatClock, formatDateLine } from '../../L3_Business/time/formatClock';
import { formatLunarDate } from '../../L3_Business/time/formatLunarDate';
import { AppIcon } from '../../L4_Atom/ui/AppIcon';
import { Button } from '../../L4_Atom/ui/animalIsland';
import { formatLocationLabel, formatWeatherName, type UiText } from '../i18n';

interface HomePageProps {
  state: AppState;
  text: UiText;
  onOpenSettings: () => void;
  hideSettingsButton?: boolean;
}

export function HomePage({ state, text, onOpenSettings, hideSettingsButton = false }: HomePageProps) {
  const [now, setNow] = useState(() => new Date());
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const settings = state.settings;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    void createUploadedBackgroundUrl(settings).then((url) => {
      objectUrl = url;
      setUploadedUrl(url);
    });

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [settings]);

  const background = useMemo(() => resolveBackground(settings.background, uploadedUrl), [settings.background, uploadedUrl]);
  const weather = state.runtime.weather;
  const temperature = weather.temperature === null ? '--' : `${Math.round(weather.temperature)}°`;
  const highLow =
    weather.temperatureMax === null || weather.temperatureMin === null
      ? ''
      : ` · ${text.home.high} ${Math.round(weather.temperatureMax)}° / ${text.home.low} ${Math.round(weather.temperatureMin)}°`;

  return (
    <main
      className={`home ${settings.background.readabilityOverlay ? '' : 'home--no-overlay'}`}
      style={{ background: background.cssBackground }}
      aria-label={text.home.aria}
    >
      {!hideSettingsButton ? (
        <div className="home__settings">
          <Button aria-label={text.home.openSettings} icon={<AppIcon name="settings" size={20} />} onClick={onOpenSettings} />
        </div>
      ) : null}
      <section className="home__content">
        <h1 className="home__time">{formatClock(now, settings.time.hourCycle)}</h1>
        <p className="home__date">{formatDateLine(now, settings.language)}</p>
        {settings.time.lunarEnabled ? <p className="home__lunar">{formatLunarDate(now, settings.language)}</p> : null}
        <p className="home__weather">
          {formatWeatherName(text, weather.value)} · {temperature}
          {highLow} · {formatLocationLabel(text, weather.locationLabel)}
        </p>
      </section>
    </main>
  );
}
