import type { BgmVersion } from '../../L2_Core/types';
import { BGM_VERSIONS } from '../../L2_Core/types';
import { GameHeading } from '../../L4_Atom/ui/GameHeading';
import { Radio } from '../../L4_Atom/ui/animalIsland';

interface BgmVersionStepProps {
  value: BgmVersion;
  onChange: (version: BgmVersion) => void;
  title: string;
  choicesAria: string;
}

export function BgmVersionStep({ value, onChange, title, choicesAria }: BgmVersionStepProps) {
  return (
    <div className="onboarding-body">
      <GameHeading>{title}</GameHeading>
      <div aria-label={choicesAria} className="choice-radio-wrap">
        <Radio
          className="choice-radio choice-radio--bgm"
          value={value}
          options={BGM_VERSIONS.map((version) => ({ label: version, value: version }))}
          size="large"
          onChange={(version) => onChange(version as BgmVersion)}
        />
      </div>
    </div>
  );
}
