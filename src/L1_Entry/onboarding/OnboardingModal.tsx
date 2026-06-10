import { useState } from 'react';
import type { AppState } from '../../L2_Core/types';
import type { AppActions } from '../providers';
import { AppIcon } from '../../L4_Atom/ui/AppIcon';
import { Button, Modal } from '../../L4_Atom/ui/animalIsland';
import { getLanguageOptions, type UiText } from '../i18n';
import { LanguageStep } from './LanguageStep';
import { BgmVersionStep } from './BgmVersionStep';
import { TownTuneStep } from './TownTuneStep';
import { AudioLoadingStep } from './AudioLoadingStep';

interface OnboardingModalProps {
  state: AppState;
  text: UiText;
  actions: AppActions;
  onOpenSettings: () => void;
}

export function OnboardingModal({ state, text, actions, onOpenSettings }: OnboardingModalProps) {
  const step = state.runtime.onboardingStep ?? 'language';
  const onboardingText = text.onboarding;
  const [townTuneUrl, setTownTuneUrl] = useState(state.settings.townTune.url ?? '');
  const [townTuneError, setTownTuneError] = useState<string | null>(null);
  const audioReady = state.runtime.audio.status === 'ready' || state.runtime.audio.status === 'playing';

  const goBack = () => {
    if (step === 'bgm') {
      actions.setOnboardingStep('language');
    }
    if (step === 'townTune') {
      actions.setOnboardingStep('bgm');
    }
    if (step === 'audioLoading') {
      actions.setOnboardingStep('townTune');
    }
  };

  const goNext = () => {
    if (step === 'language') {
      actions.setOnboardingStep('bgm');
      return;
    }
    if (step === 'bgm') {
      actions.setOnboardingStep('townTune');
      return;
    }
    if (step === 'townTune') {
      if (!townTuneUrl.trim()) {
        actions.setOnboardingStep('audioLoading');
        return;
      }
      const parseError = actions.parseTownTuneUrl(townTuneUrl.trim());
      setTownTuneError(parseError);
      if (!parseError) {
        actions.setOnboardingStep('audioLoading');
      }
      return;
    }
    if (step === 'audioLoading') {
      void actions.startAudio();
    }
  };

  const skipTownTune = () => {
    actions.clearTownTune();
    setTownTuneUrl('');
    setTownTuneError(null);
    actions.setOnboardingStep('audioLoading');
  };

  const canGoBack = step !== 'language';
  const primaryLabel = step === 'audioLoading' ? text.common.start : text.common.next;
  const primaryDisabled = step === 'audioLoading' && !audioReady;

  return (
    <>
      <div className="onboarding-page-actions" role="toolbar" aria-label={onboardingText.pageActionsAria}>
        <Button icon={<AppIcon name="skip" size={16} />} onClick={actions.skipOnboarding}>
          {text.common.skip}
        </Button>
        <Button aria-label={text.common.settings} icon={<AppIcon name="settings" size={16} />} onClick={onOpenSettings}>
          {text.common.settings}
        </Button>
      </div>
      <Modal
        open={!state.settings.onboardingCompleted}
        className="app-modal app-modal--onboarding"
        title={onboardingText.title}
        width="min(720px, calc(100vw - 24px))"
        maskClosable={false}
        typewriter={false}
        footer={
          <div className="onboarding-footer">
            <div>{canGoBack ? <Button icon={<AppIcon name="back" size={16} />} onClick={goBack}>{text.common.back}</Button> : null}</div>
            <Button
              icon={step === 'audioLoading' ? <AppIcon name="volume" size={16} /> : <AppIcon name="next" size={16} />}
              type="primary"
              disabled={primaryDisabled}
              onClick={goNext}
            >
              {primaryLabel}
            </Button>
          </div>
        }
      >
        {step === 'language' ? (
          <LanguageStep value={state.settings.language} onChange={actions.setLanguage} labels={onboardingText.language} options={getLanguageOptions()} />
        ) : null}
        {step === 'bgm' ? (
          <BgmVersionStep
            value={state.settings.bgmVersion}
            onChange={actions.setBgmVersion}
            title={onboardingText.bgm.title}
            choicesAria={onboardingText.bgm.choicesAria}
          />
        ) : null}
        {step === 'townTune' ? (
          <TownTuneStep
            value={state.settings.townTune}
            url={townTuneUrl}
            error={townTuneError}
            labels={{ ...onboardingText.townTune, notesAria: text.common.townTuneNotes, preview: text.common.preview, clear: text.common.clear }}
            onUrlChange={(url) => {
              setTownTuneUrl(url);
              setTownTuneError(null);
            }}
            onPreview={actions.previewTownTune}
            onClear={actions.clearTownTune}
            onSkip={skipTownTune}
          />
        ) : null}
        {step === 'audioLoading' ? (
          <AudioLoadingStep
            audio={state.runtime.audio}
            onPrepare={actions.prepareAudio}
            labels={onboardingText.audio}
          />
        ) : null}
      </Modal>
    </>
  );
}
