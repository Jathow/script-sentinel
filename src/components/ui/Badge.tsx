import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger';

const styles: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-slate-200',
  success: 'bg-emerald-500/20 text-emerald-300',
  warning: 'bg-amber-500/20 text-amber-300',
  danger: 'bg-red-500/20 text-red-300',
};

export function Badge({ variant = 'default', children, className = '' }: { variant?: BadgeVariant; className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}


