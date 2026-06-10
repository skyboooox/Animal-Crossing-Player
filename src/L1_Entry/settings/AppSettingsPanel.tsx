import { useRef } from 'react';
import type { AppActions } from '../providers';
import type { AppState } from '../../L2_Core/types';
import { AppIcon } from '../../L4_Atom/ui/AppIcon';
import { GameHeading } from '../../L4_Atom/ui/GameHeading';
import { Button, Card, Select, Switch, Table } from '../../L4_Atom/ui/animalIsland';
import type { SettingsSubPage } from './settingsTypes';
import { getLanguageOptions, toSupportedLanguage, type UiText } from '../i18n';

interface AppSettingsPanelProps {
  subPage?: SettingsSubPage;
  state: AppState;
  text: UiText;
  actions: AppActions;
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

export function AppSettingsPanel({ subPage, state, text, actions }: AppSettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const settings = state.settings;
  const labels = text.settings.appPanel;

  if (!subPage) {
    return (
      <div className="settings-panel-stack">
        <AppSettingsPanel subPage="Language" state={state} text={text} actions={actions} />
        <AppSettingsPanel subPage="Display" state={state} text={text} actions={actions} />
        <AppSettingsPanel subPage="Maintenance & Debug" state={state} text={text} actions={actions} />
      </div>
    );
  }

  if (subPage === 'Display') {
    return (
      <Card className="settings-section" pattern="default">
        <GameHeading level={3} tone="section">{text.settings.sections[subPage]}</GameHeading>
        <div className="field-row">
          <label>{labels.motion}</label>
          <Select
            value={settings.display.motion}
            options={[
              { key: 'full', label: labels.motionFull },
              { key: 'reduced', label: labels.motionReduced },
            ]}
            onChange={(motion) => actions.updateSettings((current) => ({ ...current, display: { ...current.display, motion: motion === 'reduced' ? 'reduced' : 'full' } }))}
          />
        </div>
      </Card>
    );
  }

  if (subPage === 'Maintenance & Debug') {
    return (
      <Card className="settings-section" pattern="default">
        <GameHeading level={3} tone="section">{text.settings.sections[subPage]}</GameHeading>
        <div className="panel-actions">
          <Button
            icon={<AppIcon name="export" size={16} />}
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
          <Button icon={<AppIcon name="import" size={16} />} onClick={() => fileInputRef.current?.click()}>
            {labels.importSettings}
          </Button>
          <Button icon={<AppIcon name="clear" size={16} />} danger onClick={() => window.confirm(labels.clearLocalSettingsConfirm) && actions.resetSettings()}>
            {labels.clearLocalSettings}
          </Button>
        </div>
        <Table
          className="settings-table"
          columns={[
            {
              title: '',
              render: (_value, record) => (
                <>
                  <strong>{String(record.scope)}</strong> · {String(record.message)}
                </>
              ),
            },
          ]}
          dataSource={state.runtime.errors.map((error) => ({
            key: error.id,
            scope: labels.errorScopes[error.scope] ?? error.scope,
            message: error.message,
          }))}
          emptyText={labels.noRecentErrors}
          showHeader={false}
        />
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
      <label className="range-row">
        <span>{labels.onboardingCompleted}</span>
        <Switch
          checked={settings.onboardingCompleted}
          onChange={(onboardingCompleted) => actions.updateSettings((current) => ({ ...current, onboardingCompleted }))}
        />
      </label>
    </Card>
  );
}
