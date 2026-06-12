import type { AppActions } from '../providers';
import type { AppState } from '../../L2_Core/types';
import { SettingsShell } from '../settings/SettingsShell';
import { Button, Modal } from '../../L4_Atom/ui/animalIsland';
import type { ModalMotionOrigin } from '../../L4_Atom/ui/animalIsland';
import type { UiText } from '../i18n';
import { incrementRenderCount } from '../renderDiagnostics';

interface SettingsPageProps {
  open: boolean;
  motionOrigin: ModalMotionOrigin | null;
  state: AppState;
  text: UiText;
  actions: AppActions;
  onClose: () => void;
}

export function SettingsPage({ open, motionOrigin, state, text, actions, onClose }: SettingsPageProps) {
  incrementRenderCount('SettingsPage');
  return (
    <>
      {open ? (
        <Button className="settings-nav-button settings-nav-button--close" aria-label={text.common.close} type="primary" onClick={onClose}>
          <span aria-hidden="true" className="settings-close-mark">
            ×
          </span>
        </Button>
      ) : null}
      <Modal
        open={open}
        motionOrigin={motionOrigin}
        className="app-modal app-modal--settings"
        width="min(1080px, calc(100vw - 24px))"
        maskClosable
        typewriter={false}
        footer={null}
      >
        <main className="settings-modal" aria-label={text.settings.modalAria}>
          <SettingsShell state={state} text={text} actions={actions} onClose={onClose} />
        </main>
      </Modal>
    </>
  );
}
