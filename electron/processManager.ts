import { BrowserWindow, app } from 'electron';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import pidusage from 'pidusage';
import treeKill from 'tree-kill';
import { setTimeout as delay } from 'node:timers/promises';
import type { RuntimeStatus, ScriptDefinition, RuntimeStateSnapshot } from '../src/shared/types';

interface ManagedProc {
  child?: ChildProcessWithoutNullStreams;
  status: RuntimeStatus;
  startTime?: number;
  lastExitCode?: number | null;
  retries: number;
  backoffMs: number;
  metrics?: { cpuPercent?: number; memMB?: number; uptimeMs?: number };
  stopping?: boolean;
  logStream?: fs.WriteStream;
}

export class ProcessManager {
  private processes = new Map<string, ManagedProc>();
  private scripts: () => ScriptDefinition[];
  private metricsTimer?: NodeJS.Timeout;

  constructor(scriptsProvider: () => ScriptDefinition[]) {
    this.scripts = scriptsProvider;
  }

  init(): void {
    // Initialize states for all scripts
    for (const s of this.scripts()) {
      if (!this.processes.has(s.id)) {
        this.processes.set(s.id, {
          status: 'stopped',
          lastExitCode: null,
          retries: 0,
          backoffMs: s.backoffMs ?? 1000,
        });
      }
    }
    // Start metrics polling
    this.metricsTimer = setInterval(() => this.sampleMetrics().catch(() => {}), 2000);
  }

  dispose(): void {
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    for (const [id] of this.processes) {
      void this.stop(id);
    }
  }

  private getLogPath(scriptId: string): string {
    const dir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, `${scriptId}.log`);
  }

  private broadcast(channel: string, payload: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(channel, payload);
    }
  }

  private emitStatus(scriptId: string): void {
    const snap = this.snapshot(scriptId);
    if (snap) this.broadcast('process:status:event', snap);
  }

  private writeLog(scriptId: string, text: string): void {
    const managed = this.processes.get(scriptId);
    if (!managed) return;
    if (!managed.logStream) {
      managed.logStream = fs.createWriteStream(this.getLogPath(scriptId), { flags: 'a' });
    }
    managed.logStream.write(text);
    this.broadcast('process:log:event', { scriptId, text });
  }

  private async sampleMetrics(): Promise<void> {
    for (const [id, p] of this.processes) {
      if (p.child?.pid && p.status === 'running') {
        try {
          const stats = await pidusage(p.child.pid);
          const uptimeMs = p.startTime ? Date.now() - p.startTime : undefined;
          p.metrics = { cpuPercent: stats.cpu, memMB: stats.memory / (1024 * 1024), uptimeMs };
          this.emitStatus(id);
        } catch {
          // ignore transient pidusage errors
        }
      }
    }
  }

  snapshot(scriptId: string): RuntimeStateSnapshot | undefined {
    const p = this.processes.get(scriptId);
    if (!p) return undefined;
    return {
      scriptId,
      pid: p.child?.pid,
      status: p.status,
      startTime: p.startTime,
      uptimeMs: p.metrics?.uptimeMs,
      cpuPercent: p.metrics?.cpuPercent,
      memMB: p.metrics?.memMB,
      lastExitCode: p.lastExitCode ?? null,
      retries: p.retries,
    };
  }

  listSnapshots(): RuntimeStateSnapshot[] {
    return Array.from(this.processes.keys())
      .map((id) => this.snapshot(id))
      .filter(Boolean) as RuntimeStateSnapshot[];
  }

  async start(id: string): Promise<void> {
    const script = this.scripts().find((s) => s.id === id);
    if (!script) throw new Error('Script not found');
    let p = this.processes.get(id);
    if (!p) {
      p = { status: 'stopped', lastExitCode: null, retries: 0, backoffMs: script.backoffMs ?? 1000 };
      this.processes.set(id, p);
    }
    if (p.child) return; // already running/starting

    const spawnOnce = () => {
      p!.status = 'starting';
      p!.startTime = Date.now();
      this.emitStatus(id);

      const child = spawn(script.command, script.args ?? [], {
        cwd: script.cwd ?? process.cwd(),
        env: { ...process.env, ...(script.env ?? {}) },
        windowsHide: true,
        shell: false,
      });
      p!.child = child;
      p!.stopping = false;

      child.stdout.on('data', (buf: Buffer) => this.writeLog(id, buf.toString()))
        .setEncoding('utf-8');
      child.stderr.on('data', (buf: Buffer) => this.writeLog(id, buf.toString()))
        .setEncoding('utf-8');

      child.on('spawn', () => {
        p!.status = 'running';
        this.emitStatus(id);
      });
      child.on('error', (err) => {
        this.writeLog(id, `\n[error] ${err.message}\n`);
      });
      child.on('exit', async (code) => {
        p!.lastExitCode = code ?? null;
        p!.child = undefined;
        const wasStopping = p!.stopping === true;
        p!.status = code === 0 && wasStopping ? 'stopped' : code === 0 ? 'stopped' : 'crashed';
        this.emitStatus(id);
        // Close log stream between runs
        if (p!.logStream) {
          p!.logStream.end();
          p!.logStream = undefined;
        }

        if (!wasStopping && (script.autoRestart || script.restartPolicy === 'always' || (script.restartPolicy === 'on-crash' && code !== 0))) {
          // backoff with cap
          const maxRetries = script.maxRetries ?? 5;
          if (maxRetries === -1 || p!.retries < maxRetries) {
            const waitMs = Math.min(30000, p!.backoffMs * Math.max(1, p!.retries + 1));
            await delay(waitMs);
            p!.retries += 1;
            this.broadcast('process:restart:event', { scriptId: id, attempt: p!.retries });
            await this.start(id);
          }
        } else {
          p!.retries = 0;
        }
      });
    };

    spawnOnce();
  }

  async stop(id: string): Promise<void> {
    const p = this.processes.get(id);
    if (!p?.child?.pid) {
      // set status to stopped
      if (p) {
        p.status = 'stopped';
        this.emitStatus(id);
      }
      return;
    }
    p.stopping = true;
    return new Promise((resolve) => {
      treeKill(p.child!.pid!, 'SIGTERM', () => {
        // The 'exit' handler will adjust state
        resolve();
      });
    });
  }

  async restart(id: string): Promise<void> {
    await this.stop(id);
    await this.start(id);
  }
}


