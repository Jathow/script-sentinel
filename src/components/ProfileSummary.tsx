import React from 'react';
import type { Profile } from '../shared/types';

export type Status = 'running' | 'starting' | 'stopped' | 'crashed' | 'restarting';

export function ProfileSummary({
  profile,
  statuses,
  onStart,
  onStop,
}: {
  profile: Profile | null;
  statuses: Record<string, { status: Status } | undefined>;
  onStart: () => void;
  onStop: () => void;
}) {
  if (!profile) return null;
  const ids = profile.scriptIds ?? [];
  const running = ids.filter((id) => {
    const st = statuses[id]?.status ?? 'stopped';
    return st === 'running' || st === 'starting' || st === 'restarting';
  }).length;
  return (
    <div className="mb-4 flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
      <div>
        <span className="font-semibold text-slate-200">{profile.name}</span> · {running}/{ids.length} running
      </div>
      <div className="flex gap-2">
        <button onClick={onStart} className="rounded-md bg-emerald-600/90 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600">Start All</button>
        <button onClick={onStop} className="rounded-md bg-rose-600/90 px-2 py-1 text-xs font-medium text-white hover:bg-rose-600">Stop All</button>
      </div>
    </div>
  );
}


