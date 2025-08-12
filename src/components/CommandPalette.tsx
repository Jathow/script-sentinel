import React from 'react';

export interface CommandItem {
  id: string;
  title: string;
  hint?: string;
  run: () => void | Promise<void>;
}

export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
}) {
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setQuery('');
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.title.toLowerCase().includes(q) || (c.hint ?? '').toLowerCase().includes(q));
  }, [commands, query]);

  const onRun = async (cmd: CommandItem) => {
    await Promise.resolve(cmd.run());
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute left-1/2 top-24 w-full max-w-2xl -translate-x-1/2 transform rounded-xl border border-white/10 bg-[#0b0f14] p-3 shadow-xl transition ${open ? '' : 'opacity-0 -translate-y-1'}`}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command..."
          className="mb-2 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          aria-label="Command input"
        />
        <ul className="max-h-72 overflow-auto rounded-md border border-white/10 bg-black/20">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">No results</li>
          ) : (
            filtered.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onRun(c)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
                >
                  <span>{c.title}</span>
                  {c.hint && <span className="text-xs text-slate-400">{c.hint}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}


