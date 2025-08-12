import React from 'react';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ checked, onChange, className = '', ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`inline-flex h-6 w-10 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500/80' : 'bg-white/10'} ${className}`}
      onClick={() => onChange(!checked)}
      {...rest}
    >
      <span
        className={`ml-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`}
      />
    </button>
  );
}


