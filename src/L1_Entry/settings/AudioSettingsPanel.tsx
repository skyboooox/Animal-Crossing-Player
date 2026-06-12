import type { AppActions } from '../providers';
import type { AppState, BgmVersion } from '../../L2_Core/types';
import { BGM_VERSIONS } from '../../L2_Core/types';
import { AppIcon } from '../../L4_Atom/ui/AppIcon';
import { GameHeading } from '../../L4_Atom/ui/GameHeading';
import { Button, Card, Input, Select, Switch } from '../../L4_Atom/ui/animalIsland';
import { NotePreview } from '../../L4_Atom/ui/NotePreview';
import type { SettingsSubPage } from './settingsTypes';
import type { UiText } from '../i18n';

interface AudioSettingsPanelProps {
  subPage?: SettingsSubPage;
  state: AppState;
  text: UiText;
  actions: AppActions;
}

export function AudioSettingsPanel({ subPage, state, text, actions }: AudioSettingsPanelProps) {
  const settings = state.settings;
  const labels = text.settings.audio;
  const bgmReloadNeeded =
    subPage === 'Playback' &&
    state.runtime.audio.currentTrack !== null &&
    state.runtime.audio.currentTrack.version !== settings.bgmVersion;

  if (!subPage) {
    return (
      <div className="settings-panel-stack">
        <AudioSettingsPanel subPage="Playback" state={state} text={text} actions={actions} />
        <AudioSettingsPanel subPage="Town Tune" state={state} text={text} actions={actions} />
        <AudioSettingsPanel subPage="Audio Cache" state={state} text={text} actions={actions} />
      </div>
    );
  }

  if (subPage === 'Town Tune') {
    const previewPlaying = state.runtime.audio.townTunePreviewStatus === 'playing';

    return (
      <Card className="settings-section" pattern="default">
        <GameHeading level={3} tone="section">{text.settings.sections[subPage]}</GameHeading>
        <div className="field-row">
          <label htmlFor="settings-town-tune">{labels.nookNetUrl}</label>
          <Input
            id="settings-town-tune"
            value={settings.townTune.url ?? ''}
            onChange={(event) => {
              if (event.target.value.trim()) {
                actions.parseTownTuneUrl(event.target.value);
              }
            }}
          />
        </div>
        <p className="muted">{settings.townTune.title ?? labels.noTownTune}</p>
        <NotePreview notes={settings.townTune.notes} ariaLabel={text.common.townTuneNotes} />
        <div className="panel-actions">
          <Button
            icon={<AppIcon name={previewPlaying ? 'clear' : 'music'} size={16} />}
            type="primary"
            disabled={settings.townTune.notes.length === 0}
            onClick={() => void actions.previewTownTune()}
          >
            {previewPlaying ? text.common.stop : text.common.preview}
          </Button>
          <Button icon={<AppIcon name="clear" size={16} />} type="primary" danger disabled={settings.townTune.notes.length === 0} onClick={actions.clearTownTune}>
            {text.common.clear}
          </Button>
        </div>
      </Card>
    );
  }

  if (subPage === 'Audio Cache') {
    return (
      <Card className="settings-section" pattern="default">
        <GameHeading level={3} tone="section">{text.settings.sections[subPage]}</GameHeading>
        <label className="range-row">
          <span>{labels.cacheAudio}</span>
          <Switch
            checked={settings.audio.cacheEnabled}
            onChange={(cacheEnabled) => actions.updateSettings((current) => ({ ...current, audio: { ...current.audio, cacheEnabled } }))}
          />
        </label>
        <div className="panel-actions">
          <Button icon={<AppIcon name="cache" size={16} />} type="primary" loading={state.runtime.audio.status === 'loading'} onClick={() => void actions.prepareAudio()}>
            {labels.cacheCurrentSet}
          </Button>
          <Button icon={<AppIcon name="clear" size={16} />} type="primary" danger onClick={() => void actions.clearAudioCache()}>
            {labels.clearAudioCache}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="settings-section" pattern="default">
      <GameHeading level={3} tone="section">{text.settings.sections.Playback}</GameHeading>
      <div className="field-row">
        <label>{labels.bgmVersion}</label>
        <Select
          value={settings.bgmVersion}
          options={BGM_VERSIONS.map((version) => ({ key: version, label: version }))}
          onChange={(value) => actions.setBgmVersion(value as BgmVersion)}
        />
      </div>
      {bgmReloadNeeded ? (
        <div className="panel-actions">
          <Button
            icon={<AppIcon name="cache" size={16} />}
            type="primary"
            loading={state.runtime.audio.status === 'loading'}
            disabled={state.runtime.audio.status === 'loading'}
            onClick={() => void actions.reloadAudio()}
          >
            {labels.reloadAudio}
          </Button>
        </div>
      ) : null}
      <label className="range-row">
        <span>{labels.bgmVolume}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.audio.bgmVolume}
          onChange={(event) =>
            actions.updateSettings((current) => ({ ...current, audio: { ...current.audio, bgmVolume: Number(event.target.value) } }))
          }
        />
      </label>
      <label className="range-row">
        <span>{labels.townTuneVolume}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.audio.townTuneVolume}
          onChange={(event) =>
            actions.updateSettings((current) => ({ ...current, audio: { ...current.audio, townTuneVolume: Number(event.target.value) } }))
          }
        />
      </label>
      <label className="range-row">
        <span>{labels.hourlyFlow}</span>
        <Switch
          checked={settings.audio.hourlyFlowEnabled}
          onChange={(hourlyFlowEnabled) => actions.updateSettings((current) => ({ ...current, audio: { ...current.audio, hourlyFlowEnabled } }))}
        />
      </label>
    </Card>
  );
}
