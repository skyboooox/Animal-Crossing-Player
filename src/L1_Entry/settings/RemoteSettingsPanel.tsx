import type { AppActions } from '../providers';
import type { AppState } from '../../L2_Core/types';
import { validateMqttSettings } from '../../L2_Core/remoteControlCore';
import { AppIcon } from '../../L4_Atom/ui/AppIcon';
import { GameHeading } from '../../L4_Atom/ui/GameHeading';
import { Button, Card, Input, Select, Switch, Table } from '../../L4_Atom/ui/animalIsland';
import type { SettingsSubPage } from './settingsTypes';
import type { UiText } from '../i18n';

interface RemoteSettingsPanelProps {
  subPage?: SettingsSubPage;
  state: AppState;
  text: UiText;
  actions: AppActions;
}

export function RemoteSettingsPanel({ subPage, state, text, actions }: RemoteSettingsPanelProps) {
  const settings = state.settings;
  const validation = validateMqttSettings(settings);
  const labels = text.settings.remote;

  if (!subPage) {
    return (
      <div className="settings-panel-stack">
        <RemoteSettingsPanel subPage="MQTT Connection" state={state} text={text} actions={actions} />
        <RemoteSettingsPanel subPage="Remote Log" state={state} text={text} actions={actions} />
      </div>
    );
  }

  if (subPage === 'Remote Log') {
    return (
      <Card className="settings-section" pattern="default">
        <GameHeading level={3} tone="section">{text.settings.sections[subPage]}</GameHeading>
        <Table
          className="settings-table"
          columns={[
            {
              title: '',
              render: (_value, record) => (
                <>
                  <strong>{String(record.kind)}</strong> · {String(record.direction)} · {String(record.summary)}
                </>
              ),
            },
          ]}
          dataSource={state.remoteLog.map((entry) => ({
            key: entry.id,
            kind: entry.kind,
            direction: entry.direction,
            summary: entry.summary,
          }))}
          emptyText={labels.noMessages}
          showHeader={false}
        />
      </Card>
    );
  }

  return (
    <Card className="settings-section" pattern="default">
      <GameHeading level={3} tone="section">{text.settings.sections['MQTT Connection']}</GameHeading>
      <label className="range-row">
        <span>{labels.enableRemoteControl}</span>
        <Switch
          checked={settings.mqtt.enabled}
          onChange={(enabled) => actions.updateSettings((current) => ({ ...current, mqtt: { ...current.mqtt, enabled } }))}
        />
      </label>
      <div className="field-row">
        <label htmlFor="mqtt-url">{labels.webSocketUrl}</label>
        <Input
          id="mqtt-url"
          value={settings.mqtt.url}
          status={validation ? 'error' : undefined}
          onChange={(event) => actions.updateSettings((current) => ({ ...current, mqtt: { ...current.mqtt, url: event.target.value } }))}
        />
        {validation ? <p className="error-text">{labels.invalidUrl}</p> : null}
      </div>
      <div className="field-row">
        <label htmlFor="mqtt-client-id">{labels.clientId}</label>
        <Input
          id="mqtt-client-id"
          value={settings.mqtt.clientId}
          onChange={(event) => actions.updateSettings((current) => ({ ...current, mqtt: { ...current.mqtt, clientId: event.target.value } }))}
        />
      </div>
      <div className="field-row">
        <label htmlFor="mqtt-username">{labels.username}</label>
        <Input
          id="mqtt-username"
          value={settings.mqtt.username}
          onChange={(event) => actions.updateSettings((current) => ({ ...current, mqtt: { ...current.mqtt, username: event.target.value } }))}
        />
      </div>
      <div className="field-row">
        <label htmlFor="mqtt-password">{labels.password}</label>
        <Input
          id="mqtt-password"
          type="password"
          value={settings.mqtt.password}
          onChange={(event) => actions.updateSettings((current) => ({ ...current, mqtt: { ...current.mqtt, password: event.target.value } }))}
        />
      </div>
      <label className="range-row">
        <span>{labels.saveCredentials}</span>
        <Switch
          checked={settings.mqtt.saveCredentials}
          onChange={(saveCredentials) => {
            if (saveCredentials && !window.confirm(labels.saveCredentialsConfirm)) {
              return;
            }
            actions.updateSettings((current) => ({ ...current, mqtt: { ...current.mqtt, saveCredentials } }));
          }}
        />
      </label>
      <div className="field-row">
        <label htmlFor="mqtt-topic">{labels.baseTopic}</label>
        <Input
          id="mqtt-topic"
          value={settings.mqtt.baseTopic}
          onChange={(event) => actions.updateSettings((current) => ({ ...current, mqtt: { ...current.mqtt, baseTopic: event.target.value } }))}
        />
      </div>
      <div className="field-row">
        <label>QoS</label>
        <Select
          value={String(settings.mqtt.qos)}
          options={[
            { key: '0', label: '0' },
            { key: '1', label: '1' },
          ]}
          onChange={(qos) => actions.updateSettings((current) => ({ ...current, mqtt: { ...current.mqtt, qos: qos === '1' ? 1 : 0 } }))}
        />
      </div>
      <label className="range-row">
        <span>{labels.retainState}</span>
        <Switch
          checked={settings.mqtt.retainState}
          onChange={(retainState) => actions.updateSettings((current) => ({ ...current, mqtt: { ...current.mqtt, retainState } }))}
        />
      </label>
      <div className="panel-actions">
        <Button
          icon={<AppIcon name="remote" size={16} />}
          disabled={Boolean(validation)}
          onClick={() => actions.updateSettings((current) => ({ ...current, mqtt: { ...current.mqtt, enabled: true } }))}
        >
          {labels.testConnection}
        </Button>
        <Button
          icon={<AppIcon name="clear" size={16} />}
          danger
          onClick={() =>
            actions.updateSettings((current) => ({
              ...current,
              mqtt: {
                ...current.mqtt,
                enabled: false,
                username: '',
                password: '',
                saveCredentials: false,
              },
            }))
          }
        >
          {labels.clearMqttConfig}
        </Button>
      </div>
      <p className="muted">{labels.status}: {labels.statuses[state.runtime.mqtt.status] ?? state.runtime.mqtt.status}</p>
    </Card>
  );
}
