
import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  colorClass?: string;
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, colorClass = 'bg-brand-xp', label }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div>
      {label && <p className="text-sm font-medium text-brand-text-secondary mb-1">{label}</p>}
      <div className="w-full bg-brand-primary h-4 rounded-full overflow-hidden">
        <div
          className={`h-4 rounded-full transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
