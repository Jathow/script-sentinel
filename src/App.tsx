import React from 'react';
import { LogsDrawer } from './components/LogsDrawer';

type Status = 'running' | 'starting' | 'stopped' | 'crashed' | 'restarting';

function Card({
  title,
  status,
  onStart,
  onStop,
  onLogs,
  cpu,
  mem,
  uptime,
  selected,
  onToggle,
}: {
  title: string;
  status: Status;
  onStart?: () => void;
  onStop?: () => void;
  onLogs?: () => void;
  cpu?: number;
  mem?: number;
  uptime?: number;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const statusColor =
    status === 'running'
      ? 'bg-emerald-400 shadow-emerald-500/40'
      : status === 'stopped'
      ? 'bg-slate-500 shadow-slate-500/40'
      : status === 'starting' || status === 'restarting'
      ? 'bg-amber-400 shadow-amber-500/40'
      : 'bg-rose-500 shadow-rose-500/40';
  const formatUptime = (ms?: number) => {
    if (!ms) return '—';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`;
  };
  return (
    <div className={`group relative rounded-xl border ${selected ? 'border-emerald-400/40' : 'border-white/10'} bg-gradient-to-b from-white/5 to-transparent p-4 backdrop-blur transition hover:border-white/20`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={!!selected} onChange={onToggle} className="accent-emerald-500" />
          <h3 className="text-slate-100">{title}</h3>
        </div>
        <span className={`h-2 w-2 rounded-full ${statusColor} shadow-[0_0_12px]`} />
      </div>
      <div className="mt-3 rounded-lg bg-black/30 ring-1 ring-white/5">
        <div className="grid grid-cols-3 gap-3 px-3 py-2 text-xs text-slate-400">
          <div>
            <div className="text-slate-300">CPU</div>
            <div>{cpu ? cpu.toFixed(0) + '%' : '—'}</div>
          </div>
          <div>
            <div className="text-slate-300">Memory</div>
            <div>{mem ? mem.toFixed(1) + ' MB' : '—'}</div>
          </div>
          <div>
            <div className="text-slate-300">Uptime</div>
            <div>{formatUptime(uptime)}</div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onStart} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Start</button>
        <button onClick={onStop} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Stop</button>
        <button onClick={onLogs} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Logs</button>
      </div>
    </div>
  );
}

export default function App() {
  const [pong, setPong] = React.useState<string>('');
  const [scripts, setScripts] = React.useState<Array<{ id: string; name: string }>>([]);
  const [statuses, setStatuses] = React.useState<Record<string, { status: Status; cpu?: number; mem?: number; uptime?: number }>>({});
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [logsOpen, setLogsOpen] = React.useState(false);
  const [activeLog, setActiveLog] = React.useState<{ id: string; name: string } | null>(null);
  React.useEffect(() => {
    window.api
      .ping()
      .then(setPong)
      .catch(() => setPong('ipc error'));
    window.api.scripts
      .list()
      .then((list) => {
        setScripts(list.map((s) => ({ id: s.id, name: s.name })));
      })
      .catch(() => setScripts([]));
    window.api.process.snapshots().then((snaps) => {
      if (!snaps) return;
      const next: typeof statuses = {};
      for (const s of snaps) {
        next[s.scriptId] = {
          status: (s.status as Status) ?? 'stopped',
          cpu: s.cpuPercent,
          mem: s.memMB,
          uptime: s.uptimeMs,
        };
      }
      setStatuses(next);
    });
    const off = window.api.process.onStatus((snap) => {
      setStatuses((prev) => ({
        ...prev,
        [snap.scriptId]: {
          status: (snap.status as Status) ?? 'stopped',
          cpu: snap.cpuPercent,
          mem: snap.memMB,
          uptime: snap.uptimeMs,
        },
      }));
    });
    return () => {
      off?.();
    };
  }, []);

  const toggleSelect = (id: string) => setSelected((p) => ({ ...p, [id]: !p[id] }));
  const startOne = (id: string) => window.api.process.start(id);
  const stopOne = (id: string) => window.api.process.stop(id);
  const openLogs = (id: string) => {
    const s = scripts.find((x) => x.id === id);
    setActiveLog(s ? { id: s.id, name: s.name } : { id, name: id });
    setLogsOpen(true);
  };
  const startSelected = () => Promise.all(Object.entries(selected).filter(([, v]) => v).map(([id]) => window.api.process.start(id)));
  const stopAll = () => Promise.all(scripts.map((s) => window.api.process.stop(s.id)));
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0f14] to-[#0a0e13] text-slate-200">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-emerald-500/20 ring-1 ring-emerald-400/50" />
            <h1 className="text-lg font-semibold tracking-wide">Script Manager</h1>
          </div>
          <div className="text-xs text-slate-400">IPC: {pong}</div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-slate-400">Dark, modern server console theme</div>
          <div className="flex gap-2">
            <button onClick={startSelected} className="rounded-md bg-emerald-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">Start Selected</button>
            <button onClick={stopAll} className="rounded-md bg-rose-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500">Stop All</button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {scripts.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-6 text-slate-400">
              No scripts yet. Use the upcoming editor to add one.
            </div>
          ) : (
            scripts.map((s) => (
              <Card
                key={s.id}
                title={s.name}
                status={statuses[s.id]?.status ?? 'stopped'}
                cpu={statuses[s.id]?.cpu}
                mem={statuses[s.id]?.mem}
                uptime={statuses[s.id]?.uptime}
                onStart={() => startOne(s.id)}
                onStop={() => stopOne(s.id)}
                selected={!!selected[s.id]}
                onToggle={() => toggleSelect(s.id)}
                onLogs={() => openLogs(s.id)}
              />
            ))
          )}
        </div>
      </main>
      <LogsDrawer
        scriptId={activeLog?.id ?? null}
        scriptName={activeLog?.name ?? null}
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
      />
    </div>
  );
}


