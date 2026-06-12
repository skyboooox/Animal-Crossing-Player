import { useRef, useState } from 'react';
import type { AppActions } from '../providers';
import type { AppState } from '../../L2_Core/types';
import { AppIcon } from '../../L4_Atom/ui/AppIcon';
import { GameHeading } from '../../L4_Atom/ui/GameHeading';
import { Button, Card, Select } from '../../L4_Atom/ui/animalIsland';
import type { SettingsSubPage } from './settingsTypes';
import { formatErrorMessage, getLanguageOptions, toSupportedLanguage, type UiText } from '../i18n';

interface AppSettingsPanelProps {
  subPage?: SettingsSubPage;
  state: AppState;
  text: UiText;
  actions: AppActions;
  onClose: () => void;
}

function downloadJson(name: string, value: string): void {
  const blob = new Blob([value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function AppSettingsPanel({ subPage, state, text, actions, onClose }: AppSettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [hourlyChimeRunning, setHourlyChimeRunning] = useState(false);
  const settings = state.settings;
  const labels = text.settings.appPanel;

  if (!subPage) {
    return (
      <div className="settings-panel-stack">
        <AppSettingsPanel subPage="Language" state={state} text={text} actions={actions} onClose={onClose} />
        <AppSettingsPanel subPage="Maintenance & Debug" state={state} text={text} actions={actions} onClose={onClose} />
      </div>
    );
  }

  if (subPage === 'Maintenance & Debug') {
    const triggerHourlyChime = async () => {
      if (hourlyChimeRunning) {
        return;
      }
      setHourlyChimeRunning(true);
      try {
        await actions.triggerHourlyChime();
      } finally {
        setHourlyChimeRunning(false);
      }
    };

    return (
      <Card className="settings-section settings-section--maintenance" pattern="default">
        <GameHeading level={3} tone="section">{text.settings.sections[subPage]}</GameHeading>
        <div className="maintenance-grid">
          <section className="maintenance-group">
            <h4>{labels.settingsFiles}</h4>
            <div className="maintenance-actions">
              <Button
                icon={<AppIcon name="export" size={16} />}
                type="primary"
                onClick={() => {
                  if (settings.mqtt.saveCredentials && settings.mqtt.password && !window.confirm(labels.exportPasswordConfirm)) {
                    return;
                  }
                  downloadJson('animal-crossing-player-settings.json', actions.exportSettings());
                }}
              >
                {labels.exportSettings}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }
                  void file.text().then((text) => {
                    if (text.includes('"password"') && !window.confirm(labels.importPasswordConfirm)) {
                      return;
                    }
                    actions.importSettings(text);
                  });
                }}
              />
              <Button icon={<AppIcon name="import" size={16} />} type="primary" onClick={() => fileInputRef.current?.click()}>
                {labels.importSettings}
              </Button>
            </div>
          </section>
          <section className="maintenance-group">
            <h4>{labels.testTools}</h4>
            <div className="maintenance-actions">
              <Button icon={<AppIcon name="volume" size={16} />} type="primary" disabled={hourlyChimeRunning} loading={hourlyChimeRunning} onClick={() => void triggerHourlyChime()}>
                {labels.triggerHourlyChime}
              </Button>
            </div>
          </section>
          <section className="maintenance-group">
            <h4>{labels.localData}</h4>
            <div className="maintenance-actions">
              <Button
                ghost
                icon={<AppIcon name="next" size={16} />}
                type="primary"
                onClick={() => {
                  actions.enterOnboarding();
                  onClose();
                }}
              >
                {labels.enterOnboarding}
              </Button>
              <Button icon={<AppIcon name="clear" size={16} />} type="primary" danger onClick={() => window.confirm(labels.clearLocalSettingsConfirm) && actions.resetSettings()}>
                {labels.clearLocalSettings}
              </Button>
            </div>
          </section>
          <section className="maintenance-group maintenance-group--errors">
            <h4>{labels.recentErrors}</h4>
            {state.runtime.errors.length ? (
              <div className="settings-error-list">
                {state.runtime.errors.map((error) => (
                  <Card key={error.id} className="settings-error-card" pattern="default">
                    <strong>{labels.errorScopes[error.scope] ?? error.scope}</strong> · {formatErrorMessage(text, error.message)}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="muted">{labels.noRecentErrors}</p>
            )}
          </section>
        </div>
      </Card>
    );
  }

  return (
    <Card className="settings-section" pattern="default">
      <GameHeading level={3} tone="section">{text.settings.sections.Language}</GameHeading>
      <div className="field-row">
        <label>{labels.applicationLanguage}</label>
        <Select
          value={settings.language}
          options={getLanguageOptions().map((option) => ({ key: option.key, label: option.label }))}
          onChange={(language) => actions.setLanguage(toSupportedLanguage(language))}
        />
      </div>
    </Card>
  );
}
