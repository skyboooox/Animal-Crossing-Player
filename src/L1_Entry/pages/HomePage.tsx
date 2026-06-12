import { memo, type CSSProperties, type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { AppState } from '../../L2_Core/types';
import { createUploadedBackgroundUrl, resolveBackground } from '../../L2_Core/backgroundCore';
import { getPresetBackgroundUrl } from '../../L3_Business/background/resolveBackground';
import { formatClock, formatDateLine } from '../../L3_Business/time/formatClock';
import { formatLunarDate } from '../../L3_Business/time/formatLunarDate';
import { AppIcon } from '../../L4_Atom/ui/AppIcon';
import { Button } from '../../L4_Atom/ui/animalIsland';
import { formatLocationLabelValue, type UiText } from '../i18n';
import { incrementRenderCount } from '../renderDiagnostics';

interface HomePageText {
  aria: string;
  openSettings: string;
  high: string;
  low: string;
  weatherValues: UiText['weather']['values'];
  weatherLocationLabels: UiText['weather']['locationLabels'];
}

interface HomePageProps {
  background: AppState['settings']['background'];
  hourCycle: AppState['settings']['time']['hourCycle'];
  lunarEnabled: boolean;
  language: AppState['settings']['language'];
  weather: AppState['runtime']['weather'];
  text: HomePageText;
  onOpenSettings: (element: HTMLElement) => void;
  hideSettingsButton?: boolean;
}

const PRESET_ASPECT_RATIO = 16 / 9;
const PAN_SPEED_PX_PER_SECOND = 12;
const PAN_SEGMENT_MS = 8000;

function randomPanAngle(): number {
  return Math.random() * 360;
}

function wrapPanOffset(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function areEqual(prev: HomePageProps, next: HomePageProps): boolean {
  return (
    prev.background === next.background &&
    prev.hourCycle === next.hourCycle &&
    prev.lunarEnabled === next.lunarEnabled &&
    prev.language === next.language &&
    prev.weather === next.weather &&
    prev.text.aria === next.text.aria &&
    prev.text.openSettings === next.text.openSettings &&
    prev.text.high === next.text.high &&
    prev.text.low === next.text.low &&
    prev.text.weatherValues === next.text.weatherValues &&
    prev.text.weatherLocationLabels === next.text.weatherLocationLabels &&
    prev.onOpenSettings === next.onOpenSettings &&
    prev.hideSettingsButton === next.hideSettingsButton
  );
}

export const HomePage = memo(function HomePage({
  background,
  hourCycle,
  lunarEnabled,
  language,
  weather,
  text,
  onOpenSettings,
  hideSettingsButton = false,
}: HomePageProps) {
  incrementRenderCount('HomePage');
  const [now, setNow] = useState(() => new Date());
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [panAngle] = useState(randomPanAngle);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const panLayerRef = useRef<HTMLDivElement | null>(null);
  const weatherName = text.weatherValues[weather.value] ?? weather.value;
  const locationLabel = formatLocationLabelValue(text.weatherLocationLabels, weather.locationLabel);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    void createUploadedBackgroundUrl({ background }).then((url) => {
      objectUrl = url;
      setUploadedUrl(url);
    });

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [background]);

  const resolvedBackground = useMemo(() => resolveBackground(background, uploadedUrl), [background, uploadedUrl]);
  const presetPanActive = background.kind === 'preset' && background.presetPanEnabled && !prefersReducedMotion;
  const backgroundStyle: CSSProperties | undefined = presetPanActive
    ? undefined
    : { background: resolvedBackground.cssBackground };
  const panLayerStyle: CSSProperties | undefined = presetPanActive
    ? { backgroundImage: `url("${getPresetBackgroundUrl(background.presetId)}")` }
    : undefined;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(query.matches);

    updatePreference();
    query.addEventListener('change', updatePreference);
    return () => query.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const element = panLayerRef.current;
    if (!element || !presetPanActive) {
      return undefined;
    }

    const angle = (panAngle * Math.PI) / 180;
    const velocityX = Math.cos(angle) * PAN_SPEED_PX_PER_SECOND;
    const velocityY = Math.sin(angle) * PAN_SPEED_PX_PER_SECOND;
    let offsetX = 0;
    let offsetY = 0;
    let tileWidth = 1;
    let tileHeight = 1;
    let animation: Animation | null = null;

    const updateTileSize = () => {
      tileHeight = Math.max(window.innerHeight, window.innerWidth / PRESET_ASPECT_RATIO);
      tileWidth = tileHeight * PRESET_ASPECT_RATIO;
      element.style.backgroundSize = `auto ${tileHeight}px`;
    };

    const commitSegment = (deltaX: number, deltaY: number) => {
      offsetX = wrapPanOffset(offsetX + deltaX, tileWidth);
      offsetY = wrapPanOffset(offsetY + deltaY, tileHeight);
      element.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
      element.style.transform = 'translate3d(0, 0, 0)';
    };

    const runSegment = () => {
      const segmentSeconds = PAN_SEGMENT_MS / 1000;
      const deltaX = velocityX * segmentSeconds;
      const deltaY = velocityY * segmentSeconds;
      animation = element.animate(
        [{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` }],
        {
          duration: PAN_SEGMENT_MS,
          easing: 'linear',
          fill: 'forwards',
        },
      );
      animation.onfinish = () => {
        commitSegment(deltaX, deltaY);
        animation?.cancel();
        runSegment();
      };
    };

    updateTileSize();
    window.addEventListener('resize', updateTileSize);
    runSegment();

    return () => {
      animation?.cancel();
      window.removeEventListener('resize', updateTileSize);
      element.style.removeProperty('background-position');
      element.style.removeProperty('background-size');
      element.style.removeProperty('transform');
    };
  }, [panAngle, presetPanActive]);

  const temperature = weather.temperature === null ? '--' : `${Math.round(weather.temperature)}°`;
  const highLow =
    weather.temperatureMax === null || weather.temperatureMin === null
      ? ''
      : ` · ${text.high} ${Math.round(weather.temperatureMax)}° / ${text.low} ${Math.round(weather.temperatureMin)}°`;

  return (
    <main
      className={`home ${background.readabilityOverlay ? '' : 'home--no-overlay'}`}
      aria-label={text.aria}
    >
      <div
        aria-hidden="true"
        className={`home__background ${presetPanActive ? 'home__background--pan' : ''}`}
        data-pan-angle={presetPanActive ? panAngle.toFixed(2) : undefined}
        data-testid="home-background"
        style={backgroundStyle}
      >
        {presetPanActive ? <div ref={panLayerRef} className="home__background-pan-layer" style={panLayerStyle} /> : null}
      </div>
      {!hideSettingsButton ? (
        <div className="home__settings">
          <Button
            aria-label={text.openSettings}
            icon={<AppIcon name="settings" size={20} />}
            type="primary"
            onClick={(event: MouseEvent<HTMLElement>) => onOpenSettings(event.currentTarget)}
          />
        </div>
      ) : null}
      <section className="home__content">
        <h1 className="home__time">{formatClock(now, hourCycle)}</h1>
        <p className="home__date">{formatDateLine(now, language)}</p>
        {lunarEnabled ? <p className="home__lunar">{formatLunarDate(now, language)}</p> : null}
        <p className="home__weather">
          {weatherName} · {temperature}
          {highLow} · {locationLabel}
        </p>
      </section>
    </main>
  );
}, areEqual);
