import React from 'react';

export type Status = 'running' | 'starting' | 'stopped' | 'crashed' | 'restarting';

export interface ScriptCardProps {
  title: string;
  status: Status;
  onStart?: () => void;
  onStop?: () => void;
  onLogs?: () => void;
  onKill?: () => void;
  onEdit?: () => void;
  retries?: number;
  lastExitCode?: number | null;
  nextRestartDelayMs?: number;
  cpu?: number;
  mem?: number;
  uptime?: number;
  selected?: boolean;
  onToggle?: () => void;
}

function formatUptime(ms?: number): string {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`;
}

export function ScriptCard({
  title,
  status,
  onStart,
  onStop,
  onLogs,
  onKill,
  onEdit,
  retries,
  lastExitCode,
  nextRestartDelayMs,
  cpu,
  mem,
  uptime,
  selected,
  onToggle,
}: ScriptCardProps) {
  const statusColor =
    status === 'running'
      ? 'bg-emerald-400 shadow-emerald-500/40'
      : status === 'stopped'
      ? 'bg-slate-500 shadow-slate-500/40'
      : status === 'starting' || status === 'restarting'
      ? 'bg-amber-400 shadow-amber-500/40'
      : 'bg-rose-500 shadow-rose-500/40';

  const isStopped = status === 'stopped';
  const isRunning = status === 'running';
  const isStarting = status === 'starting';
  const isRestarting = status === 'restarting';
  const primaryLabel = isStarting
    ? 'Starting…'
    : isRestarting
    ? 'Restarting…'
    : isRunning
    ? 'Running'
    : 'Start';

  return (
    <div
      className={`group relative rounded-xl border ${selected ? 'border-emerald-400/40' : 'border-white/10'} bg-gradient-to-b from-white/5 to-transparent p-4 backdrop-blur transition hover:border-white/20`}
      role="region"
      aria-label={`${title} card`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={!!selected} onChange={onToggle} className="accent-emerald-500" aria-label={`Select ${title}`} />
          <h3 className="text-slate-100">{title}</h3>
        </div>
        <span className={`status-led ${statusColor} ${status === 'running' ? 'animate-pulse-glow' : ''}`} />
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
        <div className="grid grid-cols-3 gap-3 px-3 pb-3 text-xs text-slate-400">
          <div>
            <div className="text-slate-300">Retries</div>
            <div>{retries ?? 0}</div>
          </div>
          <div>
            <div className="text-slate-300">Last Exit</div>
            <div>{lastExitCode ?? '—'}</div>
          </div>
          <div>
            <div className="text-slate-300">Next Restart</div>
            <div>{nextRestartDelayMs ? Math.ceil(nextRestartDelayMs / 1000) + 's' : '—'}</div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={isStopped ? onStart : undefined}
          disabled={!isStopped}
          aria-busy={isStarting || isRestarting}
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 disabled:opacity-50"
        >
          {primaryLabel}
        </button>
        <button
          onClick={onStop}
          disabled={isStopped}
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20 disabled:opacity-50"
        >
          Stop
        </button>
        <button onClick={onEdit} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Edit</button>
        <button onClick={onLogs} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Logs</button>
        <button onClick={onKill} title="Kill process tree" className="rounded-md bg-rose-600/80 px-3 py-1.5 text-sm text-white hover:bg-rose-600">Kill</button>
      </div>
    </div>
  );
}


