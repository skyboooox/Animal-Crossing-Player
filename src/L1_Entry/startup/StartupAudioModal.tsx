import type { AppState } from '../../L2_Core/types';
import { Button, Modal } from '../../L4_Atom/ui/animalIsland';
import { formatErrorMessage, type UiText } from '../i18n';
import type { AppActions } from '../providers';
import { AudioLoadingStep } from '../onboarding/AudioLoadingStep';

interface StartupAudioModalProps {
  open: boolean;
  state: AppState;
  text: UiText;
  actions: AppActions;
}

export function StartupAudioModal({ open, state, text, actions }: StartupAudioModalProps) {
  const audioReady = state.runtime.audio.status === 'ready' || state.runtime.audio.status === 'playing';

  return (
    <Modal
      open={open}
      className="app-modal app-modal--startup-audio"
      width="min(640px, calc(100vw - 24px))"
      maskClosable={false}
      typewriter={false}
      footer={
        <div className="modal-actions">
          <Button type="primary" disabled={!audioReady} loading={state.runtime.audio.status === 'loading'} onClick={() => void actions.startAudio()}>
            {text.common.start}
          </Button>
        </div>
      }
    >
      <div className="app-modal-content startup-audio">
        <AudioLoadingStep
          audio={state.runtime.audio}
          onPrepare={actions.prepareAudio}
          labels={{ ...text.onboarding.audio, title: text.startupAudio.loadingTitle }}
          formatErrorMessage={(message) => formatErrorMessage(text, message)}
        />
      </div>
    </Modal>
  );
}
