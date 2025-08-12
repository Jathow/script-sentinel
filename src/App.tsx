import React from 'react';

function Card({ title, status }: { title: string; status: 'running' | 'stopped' | 'crashed' }) {
  const statusColor =
    status === 'running'
      ? 'bg-emerald-400 shadow-emerald-500/40'
      : status === 'stopped'
      ? 'bg-slate-500 shadow-slate-500/40'
      : 'bg-rose-500 shadow-rose-500/40';
  return (
    <div className="group relative rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-4 backdrop-blur transition hover:border-white/20">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-100">{title}</h3>
        <span className={`h-2 w-2 rounded-full ${statusColor} shadow-[0_0_12px]`} />
      </div>
      <div className="mt-3 h-20 rounded-lg bg-black/30 ring-1 ring-white/5" />
      <div className="mt-4 flex gap-2">
        <button className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Start</button>
        <button className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Stop</button>
        <button className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Logs</button>
      </div>
    </div>
  );
}

export default function App() {
  const [pong, setPong] = React.useState<string>('');
  React.useEffect(() => {
    window.api
      .ping()
      .then(setPong)
      .catch(() => setPong('ipc error'));
  }, []);
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
            <button className="rounded-md bg-emerald-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500">Start Selected</button>
            <button className="rounded-md bg-rose-500/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500">Stop All</button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card title="API Server" status="running" />
          <Card title="Worker Queue" status="stopped" />
          <Card title="Data Sync" status="crashed" />
        </div>
      </main>
    </div>
  );
}


