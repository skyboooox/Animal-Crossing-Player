import type { Language } from '../../L2_Core/types';
import { GameHeading } from '../../L4_Atom/ui/GameHeading';
import { Radio } from '../../L4_Atom/ui/animalIsland';
import type { LanguageOption } from '../i18n';

interface LanguageStepProps {
  value: Language;
  onChange: (language: Language) => void;
  labels: {
    title: string;
  };
  options: LanguageOption[];
}

export function LanguageStep({ value, onChange, labels, options }: LanguageStepProps) {
  return (
    <div className="onboarding-body">
      <GameHeading>{labels.title}</GameHeading>
      <Radio
        className="choice-radio choice-radio--languages"
        value={value}
        options={options.map((option) => ({ label: option.label, value: option.key }))}
        size="large"
        onChange={(language) => onChange(language as Language)}
      />
    </div>
  );
}
