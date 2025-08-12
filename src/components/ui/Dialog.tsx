import React from 'react';

export function Dialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} role="dialog" aria-modal="true">
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute inset-0 flex items-center justify-center p-4 transition ${open ? '' : 'opacity-0 translate-y-2'}`}>
        <div className="w-full max-w-lg rounded-lg border border-white/10 bg-[#0b0f14] p-4 shadow-xl shadow-black/40">
          {children}
        </div>
      </div>
    </div>
  );
}


