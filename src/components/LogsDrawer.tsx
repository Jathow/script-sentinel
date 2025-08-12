import React from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';

export function LogsDrawer({
  scriptId,
  scriptName,
  open,
  onClose,
}: {
  scriptId: string | null;
  scriptName: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [logs, setLogs] = React.useState<string>('');
  const [follow, setFollow] = React.useState(true);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const filtered = React.useMemo(() => {
    if (!query) return logs;
    return logs
      .split(/\r?\n/)
      .filter((l) => l.toLowerCase().includes(query.toLowerCase()))
      .join('\n');
  }, [logs, query]);

  React.useEffect(() => {
    if (!open || !scriptId) return;
    window.api.process.readLog(scriptId).then((txt) => setLogs(txt ?? ''));
    const off = window.api.process.onLog((evt) => {
      if (evt.scriptId === scriptId) {
        setLogs((prev) => prev + evt.text);
      }
    });
    return () => {
      off?.();
    };
  }, [open, scriptId]);

  // With virtualization, follow is handled by List scrollToItem when data changes

  const download = async () => {
    if (!scriptId) return;
    const content = await window.api.process.readLog(scriptId);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scriptName ?? scriptId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lines = React.useMemo(() => filtered.split(/\r?\n/), [filtered]);

  return (
    <div
      className={`fixed inset-0 z-40 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-3xl transform bg-[#0b0f14] shadow-xl ring-1 ring-white/10 transition ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <div className="text-sm text-slate-400">Logs</div>
            <div className="text-lg font-semibold text-slate-100">{scriptName ?? '—'}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={() => setFollow((f) => !f)}
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            >
              {follow ? 'Pause' : 'Follow'}
            </button>
            <button onClick={download} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
              Download
            </button>
            <button onClick={onClose} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
              Close
            </button>
          </div>
        </div>
        <div ref={containerRef} className="h-[calc(100%-64px)]">
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                width={width}
                itemCount={lines.length}
                itemSize={18}
                overscanCount={50}
                ref={(list: List | null) => {
                  if (follow && list) (list as unknown as { scrollToItem: (index: number) => void }).scrollToItem(lines.length - 1);
                }}
              >
                {({ index, style }: { index: number; style: React.CSSProperties }) => (
                  <div style={style} className="px-4 font-mono text-xs leading-relaxed text-slate-200">
                    {lines[index]}
                  </div>
                )}
              </List>
            )}
          </AutoSizer>
        </div>
      </div>
    </div>
  );
}


