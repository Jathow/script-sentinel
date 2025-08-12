import React from 'react';
import type { ScriptDefinition, RestartPolicy } from '../shared/types';

function parseArgs(input: string): string[] {
  return input
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatArgs(args?: string[]): string {
  return (args ?? []).join(' ');
}

function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (key) env[key] = value;
      }
    });
  return env;
}

function formatEnv(env?: Record<string, string>): string {
  return Object.entries(env ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

export function ScriptEditorModal({
  open,
  onClose,
  initial,
  onSaved,
  profiles,
}: {
  open: boolean;
  onClose: () => void;
  initial?: ScriptDefinition | null;
  onSaved: (s: ScriptDefinition) => void;
  profiles: Array<{ id: string; name: string }>;
}) {
  const [name, setName] = React.useState(initial?.name ?? '');
  const [command, setCommand] = React.useState(initial?.command ?? '');
  const [args, setArgs] = React.useState(formatArgs(initial?.args));
  const [cwd, setCwd] = React.useState(initial?.cwd ?? '');
  const [envText, setEnvText] = React.useState(formatEnv(initial?.env));
  const [autoStart, setAutoStart] = React.useState(!!initial?.autoStart);
  const [autoRestart, setAutoRestart] = React.useState(!!initial?.autoRestart);
  const [restartPolicy, setRestartPolicy] = React.useState<RestartPolicy>(
    initial?.restartPolicy ?? 'on-crash',
  );
  const [backoffMs, setBackoffMs] = React.useState<number>(initial?.backoffMs ?? 1000);
  const [maxRetries, setMaxRetries] = React.useState<number>(initial?.maxRetries ?? 5);
  const [profileIds, setProfileIds] = React.useState<string[]>(initial?.profiles ?? []);
  const [healthPort, setHealthPort] = React.useState<string>(
    initial?.healthCheck?.port ? String(initial.healthCheck.port) : '',
  );
  const [healthUrl, setHealthUrl] = React.useState<string>(initial?.healthCheck?.url ?? '');

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setCommand(initial?.command ?? '');
    setArgs(formatArgs(initial?.args));
    setCwd(initial?.cwd ?? '');
    setEnvText(formatEnv(initial?.env));
    setAutoStart(!!initial?.autoStart);
    setAutoRestart(!!initial?.autoRestart);
    setRestartPolicy(initial?.restartPolicy ?? 'on-crash');
    setBackoffMs(initial?.backoffMs ?? 1000);
    setMaxRetries(initial?.maxRetries ?? 5);
    setProfileIds(initial?.profiles ?? []);
    setHealthPort(initial?.healthCheck?.port ? String(initial.healthCheck.port) : '');
    setHealthUrl(initial?.healthCheck?.url ?? '');
  }, [open, initial]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !command.trim()) return;
    const base = {
      name: name.trim(),
      command: command.trim(),
      args: parseArgs(args),
      cwd: cwd.trim() || undefined,
      env: parseEnv(envText),
      autoStart,
      autoRestart,
      restartPolicy,
      backoffMs,
      maxRetries,
      profiles: profileIds,
      healthCheck: {
        port: healthPort ? Number(healthPort) : undefined,
        url: healthUrl || undefined,
      },
    } satisfies Omit<ScriptDefinition, 'id'>;

    const saved = initial?.id
      ? await window.api.scripts.upsert({ id: initial.id, ...base })
      : await window.api.scripts.create(base);
    onSaved(saved);
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-3xl transform bg-[#0b0f14] shadow-xl ring-1 ring-white/10 transition ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <form onSubmit={onSubmit} className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <div className="text-sm text-slate-400">Script</div>
              <div className="text-lg font-semibold text-slate-100">
                {initial ? 'Edit Script' : 'Add Script'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-emerald-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Save
              </button>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto p-4 text-sm md:grid-cols-2">
            <div className="space-y-3">
              <label className="block">
                <div className="mb-1 text-slate-300">Name</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </label>
              <label className="block">
                <div className="mb-1 text-slate-300">Command</div>
                <input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="e.g., node, python, pwsh, or path to exe"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </label>
              <label className="block">
                <div className="mb-1 text-slate-300">Args</div>
                <input
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="space-separated args"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-slate-300">Working Directory</div>
                <input
                  value={cwd}
                  onChange={(e) => setCwd(e.target.value)}
                  placeholder="optional"
                  className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-slate-300">Profiles</div>
                <select
                  multiple
                  value={profileIds}
                  onChange={(e) =>
                    setProfileIds(Array.from(e.target.selectedOptions).map((o) => o.value))
                  }
                  className="h-28 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="space-y-3">
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoStart}
                    onChange={(e) => setAutoStart(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span className="text-slate-300">Auto Start</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoRestart}
                    onChange={(e) => setAutoRestart(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span className="text-slate-300">Auto Restart</span>
                </label>
              </div>
              <label className="block">
                <div className="mb-1 text-slate-300">Restart Policy</div>
                <select
                  value={restartPolicy}
                  onChange={(e) => setRestartPolicy(e.target.value as RestartPolicy)}
                  className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="always">Always</option>
                  <option value="on-crash">On Crash</option>
                  <option value="never">Never</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="mb-1 text-slate-300">Backoff (ms)</div>
                  <input
                    type="number"
                    min={0}
                    value={backoffMs}
                    onChange={(e) => setBackoffMs(Number(e.target.value))}
                    className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-slate-300">Max Retries (-1 = infinite)</div>
                  <input
                    type="number"
                    value={maxRetries}
                    onChange={(e) => setMaxRetries(Number(e.target.value))}
                    className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
              </div>
              <label className="block">
                <div className="mb-1 text-slate-300">Environment (KEY=VALUE per line)</div>
                <textarea
                  value={envText}
                  onChange={(e) => setEnvText(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-white/10 bg-black/40 p-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="mb-1 text-slate-300">Health Port</div>
                  <input
                    value={healthPort}
                    onChange={(e) => setHealthPort(e.target.value)}
                    placeholder="optional"
                    className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-slate-300">Health URL</div>
                  <input
                    value={healthUrl}
                    onChange={(e) => setHealthUrl(e.target.value)}
                    placeholder="optional"
                    className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </label>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


