import type { TownTuneSettings } from '../../L2_Core/types';
import { AppIcon } from '../../L4_Atom/ui/AppIcon';
import { GameHeading } from '../../L4_Atom/ui/GameHeading';
import { Button, Input } from '../../L4_Atom/ui/animalIsland';
import { NotePreview } from '../../L4_Atom/ui/NotePreview';

interface TownTuneStepProps {
  value: TownTuneSettings;
  url: string;
  error: string | null;
  labels: {
    title: string;
    url: string;
    noTune: string;
    notesAria: string;
    preview: string;
    clear: string;
    skip: string;
  };
  onUrlChange: (url: string) => void;
  onPreview: () => Promise<void>;
  onClear: () => void;
  onSkip: () => void;
}

export function TownTuneStep({ value, url, error, labels, onUrlChange, onPreview, onClear, onSkip }: TownTuneStepProps) {
  return (
    <div className="onboarding-body">
      <GameHeading>{labels.title}</GameHeading>
      <div className="field-row">
        <label htmlFor="town-tune-url">{labels.url}</label>
        <Input id="town-tune-url" value={url} onChange={(event) => onUrlChange(event.target.value)} prefix={<AppIcon name="music" size={16} />} />
      </div>
      <p className="muted">{value.title ?? labels.noTune}</p>
      <NotePreview notes={value.notes} ariaLabel={labels.notesAria} />
      {error ? <p className="error-text">{error}</p> : null}
      <div className="step-actions">
        <Button icon={<AppIcon name="music" size={16} />} disabled={value.notes.length === 0} onClick={() => void onPreview()}>
          {labels.preview}
        </Button>
        <Button icon={<AppIcon name="clear" size={16} />} disabled={value.notes.length === 0} onClick={onClear}>
          {labels.clear}
        </Button>
        <Button onClick={onSkip}>{labels.skip}</Button>
      </div>
    </div>
  );
}
