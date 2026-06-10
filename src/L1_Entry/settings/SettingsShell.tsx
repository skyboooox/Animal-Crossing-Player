import { useState } from 'react';
import type { AppActions } from '../providers';
import type { AppState } from '../../L2_Core/types';
import { AppIcon } from '../../L4_Atom/ui/AppIcon';
import { GameHeading } from '../../L4_Atom/ui/GameHeading';
import { Button, Card } from '../../L4_Atom/ui/animalIsland';
import type { CardProps } from '../../L4_Atom/ui/animalIsland';
import { AppSettingsPanel } from './AppSettingsPanel';
import { AudioSettingsPanel } from './AudioSettingsPanel';
import { IslandSettingsPanel } from './IslandSettingsPanel';
import { RemoteSettingsPanel } from './RemoteSettingsPanel';
import type { SettingsCategory } from './settingsTypes';
import type { UiText } from '../i18n';

interface SettingsShellProps {
  state: AppState;
  text: UiText;
  actions: AppActions;
  onClose: () => void;
}

const LAUNCHER_ITEMS: Array<{
  category: SettingsCategory;
  icon: JSX.Element;
  pattern: NonNullable<CardProps['pattern']>;
}> = [
  { category: 'Audio', icon: <AppIcon name="audio" size={34} />, pattern: 'app-teal' },
  { category: 'Island', icon: <AppIcon name="island" size={34} />, pattern: 'app-green' },
  { category: 'Remote', icon: <AppIcon name="remote" size={34} />, pattern: 'app-blue' },
  { category: 'App', icon: <AppIcon name="app" size={34} />, pattern: 'app-yellow' },
];

export function SettingsShell({ state, text, actions, onClose }: SettingsShellProps) {
  const [category, setCategory] = useState<SettingsCategory | null>(null);
  const categoryText = category ? text.settings.categories[category] : null;

  return (
    <div className="settings-shell">
      <header className="settings-header">
        <div>
          <GameHeading>{categoryText?.label ?? text.common.settings}</GameHeading>
          {category ? <p className="muted">{text.common.settings}</p> : null}
        </div>
        <div className="settings-actions">
          {category ? (
            <Button className="settings-nav-button settings-nav-button--back" icon={<AppIcon name="settings" size={16} />} type="text" onClick={() => setCategory(null)}>
              {text.common.settings}
            </Button>
          ) : null}
          <Button className="settings-nav-button settings-nav-button--home" icon={<AppIcon name="home" size={16} />} type="text" onClick={onClose}>
            {text.common.home}
          </Button>
        </div>
      </header>
      {!category ? (
        <nav className="settings-launcher" aria-label={text.settings.launcherAria}>
          {LAUNCHER_ITEMS.map((item) => {
            const launcherText = text.settings.categories[item.category];
            return (
              <button key={item.category} className="settings-launcher__button" type="button" onClick={() => setCategory(item.category)}>
                <Card className="settings-launcher__item" pattern={item.pattern}>
                  <span className="settings-launcher__icon">{item.icon}</span>
                  <span className="settings-launcher__title">{launcherText.label}</span>
                  <span className="settings-launcher__description">{launcherText.description}</span>
                </Card>
              </button>
            );
          })}
        </nav>
      ) : null}
      {category ? (
        <main className="settings-panel" aria-label={`${categoryText?.label ?? category} ${text.settings.panelAriaSuffix}`}>
          {category === 'Audio' ? <AudioSettingsPanel state={state} text={text} actions={actions} /> : null}
          {category === 'Island' ? <IslandSettingsPanel state={state} text={text} actions={actions} /> : null}
          {category === 'Remote' ? <RemoteSettingsPanel state={state} text={text} actions={actions} /> : null}
          {category === 'App' ? <AppSettingsPanel state={state} text={text} actions={actions} /> : null}
        </main>
      ) : null}
    </div>
  );
}
