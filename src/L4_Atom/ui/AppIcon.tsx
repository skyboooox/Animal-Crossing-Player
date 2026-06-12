import { getPublicAssetUrl } from '../utils/publicAssetUrl';

export type AppIconName =
  | 'app'
  | 'audio'
  | 'back'
  | 'cache'
  | 'clear'
  | 'export'
  | 'home'
  | 'import'
  | 'island'
  | 'music'
  | 'next'
  | 'remote'
  | 'settings'
  | 'skip'
  | 'upload'
  | 'volume'
  | 'weather';

const ICON_SLUGS: Record<AppIconName, string> = {
  app: 'mobile-phone',
  audio: 'radio',
  back: 'left-arrow',
  cache: 'package',
  clear: 'wastebasket',
  export: 'outbox-tray',
  home: 'house',
  import: 'inbox-tray',
  island: 'desert-island',
  music: 'musical-notes',
  next: 'right-arrow',
  remote: 'satellite-antenna',
  settings: 'hammer-and-wrench',
  skip: 'fast-forward-button',
  upload: 'framed-picture',
  volume: 'speaker-high-volume',
  weather: 'sun-behind-cloud',
};

interface AppIconProps {
  className?: string;
  name: AppIconName;
  size?: number;
}

export function AppIcon({ className, name, size = 18 }: AppIconProps) {
  const classes = ['app-icon', className].filter(Boolean).join(' ');

  return (
    <img
      alt=""
      aria-hidden="true"
      className={classes}
      draggable={false}
      height={size}
      src={getPublicAssetUrl(`assets/icons/fluent-emoji/${ICON_SLUGS[name]}.svg`)}
      width={size}
    />
  );
}
