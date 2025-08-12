import React from 'react';

export function Drawer({ open, onClose, side = 'right', children }: { open: boolean; onClose: () => void; side?: 'left' | 'right'; children: React.ReactNode }) {
  const sideClasses = side === 'right' ? 'right-0 translate-x-full' : 'left-0 -translate-x-full';
  const openClasses = open ? 'translate-x-0' : '';
  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} role="dialog" aria-modal="true">
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute top-0 h-full w-full max-w-xl transform bg-[#0b0f14] shadow-xl ring-1 ring-white/10 transition ${sideClasses} ${openClasses}`}>
        {children}
      </div>
    </div>
  );
}


