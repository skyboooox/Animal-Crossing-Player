import { useState } from 'react';
import { useApp } from './appContext';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingModal } from './onboarding/OnboardingModal';
import { StartupAudioModal } from './startup/StartupAudioModal';
import { AppIcon } from '../L4_Atom/ui/AppIcon';
import { Button, Loading, Modal } from '../L4_Atom/ui/animalIsland';
import { useUiText } from './i18n';

export function App() {
  const { state, loading, actions } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const text = useUiText(state?.settings.language ?? 'en');

  if (loading || !state || !text) {
    return (
      <main className="app-shell" aria-busy="true" aria-label={text?.app.loadingAria}>
        <Loading active />
      </main>
    );
  }

  const onboardingOpen = !state.settings.onboardingCompleted && !settingsOpen;
  const startupAudioOpen =
    state.settings.onboardingCompleted &&
    state.runtime.startupAudioPromptOpen &&
    state.runtime.audio.status !== 'playing' &&
    state.runtime.audio.status !== 'blocked' &&
    !settingsOpen;

  return (
    <div className="app-shell">
      <HomePage state={state} text={text} onOpenSettings={() => setSettingsOpen(true)} hideSettingsButton={onboardingOpen || startupAudioOpen || settingsOpen} />
      <SettingsPage open={settingsOpen} state={state} text={text} actions={actions} onClose={() => setSettingsOpen(false)} />
      {onboardingOpen ? (
        <OnboardingModal state={state} text={text} actions={actions} onOpenSettings={() => setSettingsOpen(true)} />
      ) : null}
      <StartupAudioModal open={startupAudioOpen} state={state} text={text} actions={actions} />
      <Modal
        open={state.runtime.audio.status === 'blocked'}
        className="app-modal app-modal--permission"
        title={text.permission.title}
        typewriter={false}
        maskClosable={false}
        footer={
          <div className="modal-actions">
            <Button onClick={actions.dismissAudioBlock}>{text.permission.later}</Button>
            <Button icon={<AppIcon name="volume" size={16} />} type="primary" onClick={() => void actions.startAudio()}>
              {text.permission.enable}
            </Button>
          </div>
        }
      >
        <div className="app-modal-content">
          <p>{text.permission.body}</p>
        </div>
      </Modal>
    </div>
  );
}
