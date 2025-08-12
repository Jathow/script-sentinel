import React from 'react';

export interface TabItem {
  id: string;
  label: string;
}

export function Tabs({ items, value, onChange, className = '' }: { items: TabItem[]; value: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div className={`inline-flex rounded-md border border-white/10 bg-black/30 p-0.5 ${className}`} role="tablist">
      {items.map((it) => {
        const active = value === it.id;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={`px-3 py-1.5 text-sm transition ${active ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-white/10'} rounded`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}


