interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="progress" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className="progress__track">
        <div className="progress__bar" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <span className="progress__text">{percent}%</span>
    </div>
  );
}
