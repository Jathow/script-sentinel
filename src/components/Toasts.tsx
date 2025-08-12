import React from 'react';

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  kind?: 'info' | 'error' | 'success';
}

export function useToasts() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const add = React.useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID();
    const item: ToastItem = { id, kind: 'info', ...t };
    setToasts((prev) => [...prev, item]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 5000);
  }, []);
  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);
  return { toasts, add, remove } as const;
}

export function Toasts({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto w-80 rounded-lg border border-white/10 bg-black/70 p-3 text-sm text-slate-200 backdrop-blur ${
            t.kind === 'error' ? 'ring-1 ring-rose-500/50' : t.kind === 'success' ? 'ring-1 ring-emerald-500/50' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">{t.title}</div>
              {t.body ? <div className="mt-1 text-xs text-slate-400">{t.body}</div> : null}
            </div>
            <button
              onClick={() => onClose(t.id)}
              className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-200 hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}


