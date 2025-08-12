import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { logManager } from './logger';

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function writeCrashDump(kind: 'uncaughtException' | 'unhandledRejection', error: unknown): string {
  const base = path.join(app.getPath('userData'), 'crashes');
  ensureDir(base);
  const ts = new Date();
  const file = path.join(base, `${ts.toISOString().replace(/[:.]/g, '-')}-${kind}.log`);
  const payload = {
    ts: ts.toISOString(),
    kind,
    message: (error as Error)?.message ?? String(error),
    stack: (error as Error)?.stack ?? null,
  };
  try {
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  } catch {
    // ignore
  }
  // Also write to structured app log
  logManager.write('app', JSON.stringify({ ts: ts.toISOString(), level: 'error', src: 'main', message: `${kind}: ${payload.message}`, stack: payload.stack }) + '\n');
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('app:crash', { kind, message: payload.message });
  }
  return file;
}


