import { useRef } from 'react';
import type { AppActions } from '../providers';
import type { AppState, IslandWeather } from '../../L2_Core/types';
import { WEATHER_VALUES } from '../../L2_Core/types';
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

function presetUrl(id: string): string {
  const extension = ['3', '4', '6', '8'].includes(id) ? 'jpeg' : 'jpg';
  return `/assets/backgroundPreset/${id}.${extension}`;
}

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
        <div className="field-row">
          <label htmlFor="solid-color">{labels.solidColor}</label>
          <Input
            id="solid-color"
            type="color"
            value={settings.background.solidColor}
            onChange={(event) => actions.updateSettings((current) => ({ ...current, background: { ...current.background, solidColor: event.target.value } }))}
          />
        </div>
        <div className="background-grid">
          {PRESET_IDS.map((id) => (
            <button
              aria-label={interpolate(labels.presetBackground, { id })}
              className={`background-swatch ${settings.background.presetId === id ? 'background-swatch--active' : ''}`}
              key={id}
              style={{ backgroundImage: `url("${presetUrl(id)}")` }}
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
          <Button icon={<AppIcon name="upload" size={16} />} onClick={() => fileInputRef.current?.click()}>
            {text.common.upload}
          </Button>
          <Button icon={<AppIcon name="clear" size={16} />} danger onClick={() => void actions.clearUploadedBackground()}>
            {labels.clearUploadedBackground}
          </Button>
        </div>
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
        <div className="field-row">
          <label>{labels.hourCycle}</label>
          <Select
            value={settings.time.hourCycle}
            options={[
              { key: '24h', label: '24h' },
              { key: '12h', label: '12h' },
            ]}
            onChange={(hourCycle) => actions.updateSettings((current) => ({ ...current, time: { ...current.time, hourCycle: hourCycle as '24h' | '12h' } }))}
          />
        </div>
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
          onChange={(mode) => actions.updateSettings((current) => ({ ...current, weather: { ...current.weather, mode: mode === 'manual' ? 'manual' : 'auto' } }))}
        />
      </div>
      <div className="field-row">
        <label>{labels.manualWeather}</label>
        <Select
          value={settings.weather.manualValue}
          options={WEATHER_VALUES.map((value) => ({ key: value, label: formatWeatherName(text, value) }))}
          onChange={(value) => actions.setManualWeather(value as IslandWeather, settings.weather.manualLocationLabel)}
        />
      </div>
      <div className="field-row">
        <label htmlFor="manual-location">{labels.manualLocationLabel}</label>
        <Input
          id="manual-location"
          value={settings.weather.manualLocationLabel}
          onChange={(event) => actions.setManualWeather(settings.weather.manualValue, event.target.value)}
        />
      </div>
      <div className="panel-actions">
        <Button icon={<AppIcon name="weather" size={16} />} disabled={settings.weather.mode === 'manual'} onClick={() => void actions.refreshWeather()}>
          {labels.refreshWeather}
        </Button>
      </div>
      <p className="muted">
        {labels.current}: {formatWeatherName(text, state.runtime.weather.value)} · {formatLocationLabel(text, state.runtime.weather.locationLabel)}
      </p>
    </Card>
  );
}
