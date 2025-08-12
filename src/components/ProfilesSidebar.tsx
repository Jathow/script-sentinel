import React from 'react';
import type { Profile } from '../shared/types';

export function ProfilesSidebar({
  profiles,
  activeProfileId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onToggleAutostart,
}: {
  profiles: Profile[];
  activeProfileId: string | 'all';
  onSelect: (id: string | 'all') => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggleAutostart: (id: string, value: boolean) => void;
}) {
  const [newName, setNewName] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');

  return (
    <aside className="h-full w-64 shrink-0 border-r border-white/10 bg-black/20">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="text-sm font-semibold text-slate-200">Profiles</div>
        <button
          onClick={() => onSelect('all')}
          className={`rounded px-2 py-1 text-xs ${activeProfileId === 'all' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}
        >
          All
        </button>
      </div>
      <div className="p-3">
        <div className="mb-3 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New profile"
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={() => {
              if (!newName.trim()) return;
              onCreate(newName.trim());
              setNewName('');
            }}
            className="rounded-md bg-emerald-500/90 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
          >
            Add
          </button>
        </div>
        <ul className="space-y-1">
          {profiles.map((p) => (
            <li key={p.id} className={`group rounded px-2 py-1 text-sm ${activeProfileId === p.id ? 'bg-white/10' : 'hover:bg-white/10'}`}>
              <div className="flex items-center justify-between">
              {editingId === p.id ? (
                <input
                  className="w-full rounded border border-white/10 bg-black/40 px-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editName.trim()) onRename(p.id, editName.trim());
                      setEditingId(null);
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                />
              ) : (
                <button onClick={() => onSelect(p.id)} className="truncate text-left text-slate-200">
                  {p.name}
                </button>
              )}
              <div className="ml-2 hidden gap-1 group-hover:flex">
                {editingId === p.id ? null : (
                  <button
                    title="Rename"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditName(p.name);
                    }}
                    className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200 hover:bg-white/20"
                  >
                    Rename
                  </button>
                )}
                <button
                  title="Delete"
                  onClick={() => onDelete(p.id)}
                  className="rounded bg-rose-600/80 px-1.5 py-0.5 text-xs text-white hover:bg-rose-600"
                >
                  Delete
                </button>
              </div>
              </div>
              <label className="mt-1 flex items-center justify-between text-xs text-slate-400">
                <span>Auto-start on login</span>
                <input
                  type="checkbox"
                  checked={!!p.autoStartOnLogin}
                  onChange={(e) => onToggleAutostart(p.id, e.target.checked)}
                  className="accent-emerald-500"
                />
              </label>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}


