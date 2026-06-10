import type { AppActions } from '../providers';
import type { AppState } from '../../L2_Core/types';
import { SettingsShell } from '../settings/SettingsShell';
import { Modal } from '../../L4_Atom/ui/animalIsland';
import type { UiText } from '../i18n';

interface SettingsPageProps {
  open: boolean;
  state: AppState;
  text: UiText;
  actions: AppActions;
  onClose: () => void;
}

export function SettingsPage({ open, state, text, actions, onClose }: SettingsPageProps) {
  return (
    <Modal open={open} className="app-modal app-modal--settings" width="min(920px, calc(100vw - 24px))" maskClosable typewriter={false} footer={null}>
      <main className="settings-modal" aria-label={text.settings.modalAria}>
        <SettingsShell state={state} text={text} actions={actions} onClose={onClose} />
      </main>
    </Modal>
  );
}
