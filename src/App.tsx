import React from 'react';
import { LogsDrawer } from './components/LogsDrawer';
import type { ScriptDefinition, Profile } from './shared/types';
import { ScriptEditorModal } from './components/ScriptEditorModal';
import { ProfilesSidebar } from './components/ProfilesSidebar';
import { ProfileSummary } from './components/ProfileSummary';
import { SettingsModal } from './components/SettingsModal';
import { Toasts, useToasts } from './components/Toasts';
import { ScriptCard } from './components/ScriptCard';
import { CommandPalette, type CommandItem } from './components/CommandPalette';

type Status = 'running' | 'starting' | 'stopped' | 'crashed' | 'restarting';

function Card({
  title,
  status,
  onStart,
  onStop,
  onLogs,
  onKill,
  retries,
  lastExitCode,
  nextRestartDelayMs,
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
  onKill?: () => void;
  retries?: number;
  lastExitCode?: number | null;
  nextRestartDelayMs?: number;
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
        <button onClick={onStart} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Start</button>
        <button onClick={onStop} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Stop</button>
        <button onClick={onLogs} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Logs</button>
        <button onClick={onKill} title="Kill process tree" className="rounded-md bg-rose-600/80 px-3 py-1.5 text-sm text-white hover:bg-rose-600">Kill</button>
      </div>
    </div>
  );
}

export default function App() {
  const [pong, setPong] = React.useState<string>('');
  const [scripts, setScripts] = React.useState<ScriptDefinition[]>([]);
  const [statuses, setStatuses] = React.useState<Record<string, { status: Status; pid?: number; cpu?: number; mem?: number; uptime?: number; healthy?: boolean; retries?: number; lastExitCode?: number | null; backoffMs?: number; nextRestartDelayMs?: number }>>({});
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [logsOpen, setLogsOpen] = React.useState(false);
  const [activeLog, setActiveLog] = React.useState<{ id: string; name: string } | null>(null);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<Status | 'all'>('all');
  const [profileFilter, setProfileFilter] = React.useState<string>('all');
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ScriptDefinition | null>(null);
  const { toasts, add: addToast, remove: removeToast } = useToasts();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    const api = (window as unknown as { api?: Window['api'] }).api;
    if (!api) {
      setPong('no preload');
      return;
    }
    api
      .ping()
      .then(setPong)
      .catch(() => setPong('ipc error'));
    api.scripts
      .list()
      .then((list) => setScripts(list))
      .catch(() => setScripts([]));
    api.profiles
      .list()
      .then((p) => setProfiles(p))
      .catch(() => setProfiles([]));
    api.process.snapshots().then((snaps) => {
      if (!snaps) return;
      const next: typeof statuses = {};
      for (const s of snaps) {
         next[s.scriptId] = {
          status: (s.status as Status) ?? 'stopped',
           pid: s.pid ?? undefined,
          cpu: s.cpuPercent,
          mem: s.memMB,
          uptime: s.uptimeMs,
          healthy: (s as { healthy?: boolean }).healthy,
        };
      }
      setStatuses(next);
    });
    const off = api.process.onStatus((snap) => {
      setStatuses((prev) => ({
        ...prev,
        [snap.scriptId]: {
          status: (snap.status as Status) ?? 'stopped',
           pid: snap.pid ?? undefined,
          cpu: snap.cpuPercent,
          mem: snap.memMB,
          uptime: snap.uptimeMs,
          healthy: (snap as { healthy?: boolean }).healthy,
          retries: snap.retries,
          lastExitCode: snap.lastExitCode ?? null,
          backoffMs: (snap as { backoffMs?: number }).backoffMs,
          nextRestartDelayMs: (snap as { nextRestartDelayMs?: number }).nextRestartDelayMs,
        },
      }));
      if ((snap.status as Status) === 'crashed') {
        // Check toast preference
        api.settings.get().then((s) => {
          if (s.notificationsToastEnabled === false) return;
          const sdef = scripts.find((x) => x.id === snap.scriptId);
          addToast({
            title: 'Script crashed',
            body: `${sdef?.name ?? snap.scriptId} exited with code ${snap.lastExitCode ?? 'unknown'}`,
            kind: 'error',
          });
        });
      }
    });
    return () => {
      off?.();
    };
  }, []);

  const toggleSelect = (id: string) => setSelected((p) => ({ ...p, [id]: !p[id] }));
  const startOne = async (id: string) => {
    try {
      await (window.api?.process.start(id) as unknown as Promise<void>);
      const s = scripts.find((x) => x.id === id);
      addToast({ title: 'Started', body: s?.name ?? id, kind: 'success' });
    } catch (e) {
      addToast({ title: 'Start failed', body: (e as Error)?.message ?? String(e), kind: 'error' });
      throw e;
    }
  };
  const stopOne = async (id: string) => {
    try {
      await (window.api?.process.stop(id) as unknown as Promise<void>);
      const s = scripts.find((x) => x.id === id);
      addToast({ title: 'Stopped', body: s?.name ?? id, kind: 'info' });
    } catch (e) {
      addToast({ title: 'Stop failed', body: (e as Error)?.message ?? String(e), kind: 'error' });
      throw e;
    }
  };
  const killOne = async (id: string) => {
    try {
      await (window.api?.process.killTree(id) as unknown as Promise<void>);
      const s = scripts.find((x) => x.id === id);
      addToast({ title: 'Killed', body: s?.name ?? id, kind: 'info' });
    } catch (e) {
      addToast({ title: 'Kill failed', body: (e as Error)?.message ?? String(e), kind: 'error' });
      throw e;
    }
  };
  const openLogs = (id: string) => {
    const s = scripts.find((x) => x.id === id);
    setActiveLog(s ? { id: s.id, name: s.name } : { id, name: id });
    setLogsOpen(true);
  };
  const startSelected = () => Promise.all(Object.entries(selected).filter(([, v]) => v).map(([id]) => startOne(id)));
  const stopAll = () => Promise.all(scripts.map((s) => stopOne(s.id)));
  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (id: string) => {
    const s = scripts.find((x) => x.id === id) ?? null;
    setEditing(s);
    setEditorOpen(true);
  };
  const onSaved = (saved: ScriptDefinition) => {
    setScripts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx === -1) return [...prev, saved];
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
  };

  const deleteOne = async (id: string) => {
    try {
      await window.api?.scripts.delete(id);
      setScripts((prev) => prev.filter((s) => s.id !== id));
      addToast({ title: 'Deleted', body: id, kind: 'info' });
    } catch (e) {
      addToast({ title: 'Delete failed', body: (e as Error)?.message ?? String(e), kind: 'error' });
      throw e;
    }
  };

  const filtered = React.useMemo(() => {
    return scripts.filter((s) => {
      const nameOk = !query || s.name.toLowerCase().includes(query.toLowerCase());
      const statusOk =
        statusFilter === 'all' || (statuses[s.id]?.status ?? 'stopped') === statusFilter;
      const profileOk =
        profileFilter === 'all' || (s.profiles ?? []).includes(profileFilter);
      return nameOk && statusOk && profileOk;
    });
  }, [scripts, query, statusFilter, profileFilter, statuses]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K: focus search
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // If palette is open, close it; otherwise open
        setCmdOpen((v) => !v);
        if (!cmdOpen) searchInputRef.current?.blur();
      }
      // Ctrl/Cmd+Enter: start selected
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === 'Enter') {
        e.preventDefault();
        void startSelected();
      }
      // Ctrl+Shift+S: stop all
      if (e.ctrlKey && e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void stopAll();
      }
      // Ctrl/Cmd+A: select all filtered
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'a') {
        // only if focus is not inside input/textarea
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        e.preventDefault();
        setSelected((prev) => {
          const next = { ...prev };
          for (const s of filtered) next[s.id] = true;
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, startSelected, stopAll, cmdOpen]);

  const commands: CommandItem[] = React.useMemo(() => [
    { id: 'add-script', title: 'Add Script…', run: openCreate },
    { id: 'start-selected', title: 'Start Selected', run: () => void startSelected() },
    { id: 'stop-all', title: 'Stop All', run: () => void stopAll() },
    ...(profileFilter !== 'all'
      ? [
          { id: 'start-profile', title: 'Start Current Profile', run: () => void window.api?.profiles.startAll(profileFilter) },
          { id: 'stop-profile', title: 'Stop Current Profile', run: () => void window.api?.profiles.stopAll(profileFilter) },
        ]
      : []),
    { id: 'open-settings', title: 'Open Settings', run: () => setSettingsOpen(true) },
  ], [profileFilter, startSelected, stopAll]);
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0f14] to-[#0a0e13] text-slate-200">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/30 backdrop-blur" role="banner">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-emerald-500/20 ring-1 ring-emerald-400/50" />
            <h1 className="text-lg font-semibold tracking-wide">Script Manager</h1>
          </div>
          <div className="flex items-center gap-3">
            <button aria-label="Open settings" onClick={() => setSettingsOpen(true)} className="rounded-md bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20">Settings</button>
            <div className="text-xs text-slate-400">IPC: {pong}</div>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-7xl gap-6 px-6 py-8" role="main">
        <ProfilesSidebar
          profiles={profiles}
          activeProfileId={profileFilter}
          onSelect={(id) => setProfileFilter(id)}
          onCreate={async (name) => {
            const created = await (window.api?.profiles.upsert({ id: crypto.randomUUID(), name, scriptIds: [], autoStartOnLogin: false }) as Promise<Profile>);
            setProfiles((prev) => [...prev, created]);
          }}
          onRename={async (id, name) => {
            const p = profiles.find((x) => x.id === id);
            if (!p) return;
            const updated = await (window.api?.profiles.upsert({ ...p, name }) as Promise<Profile>);
            setProfiles((prev) => prev.map((x) => (x.id === id ? updated : x)));
          }}
          onDelete={async (id) => {
            await window.api?.profiles.delete(id);
            setProfiles((prev) => prev.filter((x) => x.id !== id));
          }}
          onToggleAutostart={async (id, value) => {
            const p = profiles.find((x) => x.id === id);
            if (!p) return;
            const updated = await (window.api?.profiles.upsert({ ...p, autoStartOnLogin: value }) as Promise<Profile>);
            setProfiles((prev) => prev.map((x) => (x.id === id ? updated : x)));
          }}
        />
        <div className="min-w-0 flex-1">
        <div className="mb-6 grid grid-cols-1 items-center gap-3 md:grid-cols-2 lg:grid-cols-3" aria-label="Toolbar" role="region">
          <div className="text-sm text-slate-400">Dark, modern server console theme</div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              aria-label="Search scripts by name"
              className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status | 'all')}
              aria-label="Filter by status"
              className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All statuses</option>
              <option value="running">Running</option>
              <option value="starting">Starting</option>
              <option value="restarting">Restarting</option>
              <option value="stopped">Stopped</option>
              <option value="crashed">Crashed</option>
            </select>
            <select
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
              aria-label="Filter by profile"
              className="rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All profiles</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button aria-label="Add script" onClick={openCreate} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Add Script</button>
            <button aria-label="Select all filtered" onClick={() => setSelected((prev) => { const next = { ...prev }; for (const s of filtered) next[s.id] = true; return next; })} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Select All</button>
            <button aria-label="Clear selection" onClick={() => setSelected({})} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Clear</button>
            <button aria-label="Start selected scripts" onClick={startSelected} className="rounded-md bg-emerald-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">Start Selected</button>
            <button aria-label="Stop all scripts" onClick={stopAll} className="rounded-md bg-rose-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500">Stop All</button>
            {profileFilter !== 'all' && (
              <>
                <button aria-label="Start all scripts in selected profile" onClick={() => window.api.profiles.startAll(profileFilter)} className="rounded-md bg-emerald-600/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600">Start Profile</button>
                <button aria-label="Stop all scripts in selected profile" onClick={() => window.api.profiles.stopAll(profileFilter)} className="rounded-md bg-rose-600/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-600">Stop Profile</button>
              </>
            )}
          </div>
        </div>
        {profileFilter !== 'all' && (
          <ProfileSummary
            profile={profiles.find((p) => p.id === profileFilter) ?? null}
            statuses={statuses}
            onStart={() => window.api.profiles.startAll(profileFilter)}
            onStop={() => window.api.profiles.stopAll(profileFilter)}
          />
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="region" aria-label="Scripts grid">
          {scripts.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-6 text-slate-400">
              No scripts yet. Use the upcoming editor to add one.
            </div>
          ) : (
            filtered.map((s) => (
              <ScriptCard
                key={s.id}
                title={s.name}
                status={statuses[s.id]?.status ?? 'stopped'}
                pid={statuses[s.id]?.pid}
                cpu={statuses[s.id]?.cpu}
                mem={statuses[s.id]?.mem}
                uptime={statuses[s.id]?.uptime}
                retries={statuses[s.id]?.retries}
                lastExitCode={statuses[s.id]?.lastExitCode}
                nextRestartDelayMs={statuses[s.id]?.nextRestartDelayMs}
                onStart={() => startOne(s.id)}
                onStop={() => stopOne(s.id)}
                onKill={() => killOne(s.id)}
                onEdit={() => openEdit(s.id)}
                onDelete={() => deleteOne(s.id)}
                selected={!!selected[s.id]}
                onToggle={() => toggleSelect(s.id)}
                onLogs={() => openLogs(s.id)}
              />
            ))
          )}
        </div>
        </div>
      </main>
      <LogsDrawer
        scriptId={activeLog?.id ?? null}
        scriptName={activeLog?.name ?? null}
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
      />
      <ScriptEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editing}
        onSaved={onSaved}
        profiles={profiles}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />
      <Toasts toasts={toasts} onClose={removeToast} />
    </div>
  );
}


