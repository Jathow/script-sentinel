import React from 'react';
import type { AppSettings } from '../shared/types';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [settings, setSettings] = React.useState<AppSettings | null>(null);

  React.useEffect(() => {
    if (!open) return;
    window.api.settings.get().then((s) => setSettings(s));
  }, [open]);

  const update = (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...(prev ?? {}), ...patch }));
  };

  const save = async () => {
    if (!settings) return;
    await window.api.settings.update(settings);
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div className={`absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 transform rounded-lg border border-white/10 bg-[#0b0f14] shadow-xl`}>
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="text-lg font-semibold text-slate-100">Settings</div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Close</button>
            <button onClick={save} className="rounded-md bg-emerald-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">Save</button>
          </div>
        </div>
        <div className="space-y-4 p-4 text-sm">
          <div>
            <div className="mb-1 text-slate-300">Theme</div>
            <select
              value={settings?.theme ?? 'dark'}
              onChange={(e) => update({ theme: e.target.value as 'dark' | 'system' })}
              className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!(settings?.notificationsNativeEnabled ?? settings?.notifications ?? true)}
                onChange={(e) => update({ notificationsNativeEnabled: e.target.checked })}
                className="accent-emerald-500"
              />
              <span className="text-slate-300">Enable native notifications</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!(settings?.notificationsToastEnabled ?? true)}
                onChange={(e) => update({ notificationsToastEnabled: e.target.checked })}
                className="accent-emerald-500"
              />
              <span className="text-slate-300">Enable in-app toasts</span>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!settings?.startMinimized}
                onChange={(e) => update({ startMinimized: e.target.checked })}
                className="accent-emerald-500"
              />
              <span className="text-slate-300">Start minimized</span>
            </label>
            <label className="block">
              <div className="mb-1 text-slate-300">Update channel</div>
              <select
                value={settings?.updateChannel ?? 'stable'}
                onChange={(e) => update({ updateChannel: e.target.value as 'stable' | 'beta' })}
                className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="stable">Stable</option>
                <option value="beta">Beta</option>
              </select>
            </label>
          </div>
          <label className="block">
            <div className="mb-1 text-slate-300">Logs path</div>
            <input
              value={settings?.logsPath ?? ''}
              onChange={(e) => update({ logsPath: e.target.value })}
              placeholder="Leave empty for default"
              className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const data = await window.api.data.export();
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: 'application/json',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'script-sentinel-backup.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            >
              Export Config
            </button>
            <label className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">
              Import Config
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  try {
                    const json = JSON.parse(text);
                    await window.api.data.import({ data: json, mode: 'merge' });
                    onClose();
                    location.reload();
                  } catch {
                    // simple ignore; could toast
                  }
                }}
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await window.api.updates.check();
              }}
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            >
              Check for updates
            </button>
            <button
              onClick={async () => {
                await window.api.updates.download();
              }}
              className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            >
              Download update
            </button>
            <button
              onClick={() => window.api.updates.quitAndInstall()}
              className="rounded-md bg-emerald-600/90 px-3 py-1.5 text-sm text-white hover:bg-emerald-600"
            >
              Restart and install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


