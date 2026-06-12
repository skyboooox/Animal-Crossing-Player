import { useRef } from 'react';
import type { AppActions } from '../providers';
import type { AppState } from '../../L2_Core/types';
import { getPresetBackgroundUrl } from '../../L3_Business/background/resolveBackground';
import { AppIcon } from '../../L4_Atom/ui/AppIcon';
import { GameHeading } from '../../L4_Atom/ui/GameHeading';
import { Button, Card, Input, Select, Switch } from '../../L4_Atom/ui/animalIsland';
import type { SettingsSubPage } from './settingsTypes';
import { formatLocationLabel, formatWeatherName, interpolate, type UiText } from '../i18n';

interface IslandSettingsPanelProps {
  subPage?: SettingsSubPage;
  state: AppState;
  text: UiText;
  actions: AppActions;
}

const PRESET_IDS = Array.from({ length: 15 }, (_, index) => String(index));

export function IslandSettingsPanel({ subPage, state, text, actions }: IslandSettingsPanelProps) {
  const settings = state.settings;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const labels = text.settings.island;

  if (!subPage) {
    return (
      <div className="settings-panel-stack">
        <IslandSettingsPanel subPage="Weather & Location" state={state} text={text} actions={actions} />
        <IslandSettingsPanel subPage="Background" state={state} text={text} actions={actions} />
        <IslandSettingsPanel subPage="Date & Time" state={state} text={text} actions={actions} />
      </div>
    );
  }

  if (subPage === 'Background') {
    const backgroundKind = settings.background.kind;

    return (
      <Card className="settings-section" pattern="default">
        <GameHeading level={3} tone="section">{text.settings.sections[subPage]}</GameHeading>
        <div className="field-row">
          <label>{labels.kind}</label>
          <Select
            value={settings.background.kind}
            options={[
              { key: 'solid', label: labels.solid },
              { key: 'preset', label: labels.preset },
              { key: 'uploaded', label: labels.uploaded },
            ]}
            onChange={(kind) => actions.updateSettings((current) => ({ ...current, background: { ...current.background, kind: kind as typeof current.background.kind } }))}
          />
        </div>
        {backgroundKind === 'solid' ? (
          <div className="field-row">
            <label htmlFor="solid-color">{labels.solidColor}</label>
            <Input
              id="solid-color"
              type="color"
              value={settings.background.solidColor}
              onChange={(event) => actions.updateSettings((current) => ({ ...current, background: { ...current.background, solidColor: event.target.value } }))}
            />
          </div>
        ) : null}
        {backgroundKind === 'preset' ? (
          <>
            <div className="background-grid">
              {PRESET_IDS.map((id) => (
                <button
                  aria-label={interpolate(labels.presetBackground, { id })}
                  className={`background-swatch ${settings.background.presetId === id ? 'background-swatch--active' : ''}`}
                  key={id}
                  style={{ backgroundImage: `url("${getPresetBackgroundUrl(id)}")` }}
                  type="button"
                  onClick={() =>
                    actions.updateSettings((current) => ({
                      ...current,
                      background: { ...current.background, kind: 'preset', presetId: id },
                    }))
                  }
                />
              ))}
            </div>
            <label className="range-row">
              <span>{labels.presetPan}</span>
              <Switch
                checked={settings.background.presetPanEnabled}
                onChange={(presetPanEnabled) => actions.updateSettings((current) => ({ ...current, background: { ...current.background, presetPanEnabled } }))}
              />
            </label>
          </>
        ) : null}
        {backgroundKind === 'uploaded' ? (
          <div className="panel-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void actions.uploadBackground(file);
                }
              }}
            />
            <Button icon={<AppIcon name="upload" size={16} />} type="primary" onClick={() => fileInputRef.current?.click()}>
              {text.common.upload}
            </Button>
            <Button icon={<AppIcon name="clear" size={16} />} type="primary" danger disabled={!settings.background.uploadedImageId} onClick={() => void actions.clearUploadedBackground()}>
              {labels.clearUploadedBackground}
            </Button>
          </div>
        ) : null}
        <label className="range-row">
          <span>{labels.readabilityOverlay}</span>
          <Switch
            checked={settings.background.readabilityOverlay}
            onChange={(readabilityOverlay) => actions.updateSettings((current) => ({ ...current, background: { ...current.background, readabilityOverlay } }))}
          />
        </label>
      </Card>
    );
  }

  if (subPage === 'Date & Time') {
    return (
      <Card className="settings-section" pattern="default">
        <GameHeading level={3} tone="section">{text.settings.sections[subPage]}</GameHeading>
        <label className="range-row">
          <span>{labels.hourCycle}</span>
          <Switch
            checked={settings.time.hourCycle === '24h'}
            onChange={(use24Hour) => actions.updateSettings((current) => ({ ...current, time: { ...current.time, hourCycle: use24Hour ? '24h' : '12h' } }))}
          />
        </label>
        <label className="range-row">
          <span>{labels.lunarDate}</span>
          <Switch
            checked={settings.time.lunarEnabled}
            onChange={(lunarEnabled) => actions.updateSettings((current) => ({ ...current, time: { ...current.time, lunarEnabled } }))}
          />
        </label>
      </Card>
    );
  }

  return (
    <Card className="settings-section" pattern="default">
      <GameHeading level={3} tone="section">{text.settings.sections['Weather & Location']}</GameHeading>
      <div className="field-row">
        <label>{labels.mode}</label>
        <Select
          value={settings.weather.mode}
          options={[
            { key: 'auto', label: labels.autoLocation },
            { key: 'manual', label: labels.manual },
          ]}
          onChange={(mode) =>
            actions.updateSettings((current) => ({
              ...current,
              weather: {
                ...current.weather,
                mode: mode === 'manual' ? 'manual' : 'auto',
                lastAuto: mode === current.weather.mode ? current.weather.lastAuto : null,
              },
            }))
          }
        />
      </div>
      {settings.weather.mode === 'manual' ? (
        <div className="field-row">
          <label htmlFor="manual-location">{labels.manualLocationLabel}</label>
          <Input
            id="manual-location"
            value={settings.weather.manualLocationLabel}
            onChange={(event) => actions.setManualWeatherLocation(event.target.value)}
          />
        </div>
      ) : null}
      <div className="panel-actions">
        <Button
          icon={<AppIcon name="weather" size={16} />}
          type="primary"
          disabled={settings.weather.mode === 'manual' && settings.weather.manualLocationLabel.trim().length === 0}
          onClick={() => void actions.refreshWeather()}
        >
          {labels.refreshWeather}
        </Button>
      </div>
      <p className="muted">
        {labels.current}: {formatWeatherName(text, state.runtime.weather.value)} · {formatLocationLabel(text, state.runtime.weather.locationLabel)}
      </p>
    </Card>
  );
}
