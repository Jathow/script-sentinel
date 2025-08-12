import { app, Notification } from 'electron';
import { Storage } from './storage';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import pidusage from 'pidusage';
import treeKill from 'tree-kill';
import { setTimeout as delay } from 'node:timers/promises';
import { computeBackoffDelayMs, waitFor } from './backoff';
import type { RuntimeStatus, ScriptDefinition, RuntimeStateSnapshot } from '../src/shared/types';
import type { MetricsSampler } from './metrics';
import { PidUsageSampler } from './metrics';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { detectSecretValues, maskTextWithSecrets } from './secrets';

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
  healthy?: boolean;
  nextRestartAt?: number;
  secretValues?: string[];
}

export class ProcessManager {
  private processes = new Map<string, ManagedProc>();
  private scripts: () => ScriptDefinition[];
  private metricsTimer?: NodeJS.Timeout;
  private metricsSampler: MetricsSampler;

  constructor(scriptsProvider: () => ScriptDefinition[], sampler: MetricsSampler = new PidUsageSampler()) {
    this.scripts = scriptsProvider;
    this.metricsSampler = sampler;
  }

  private static readonly ALLOWED_TRANSITIONS: Record<RuntimeStatus, RuntimeStatus[]> = {
    stopped: ['starting', 'restarting'],
    starting: ['running', 'stopped', 'crashed'],
    running: ['stopped', 'crashed', 'restarting'],
    crashed: ['starting', 'restarting', 'stopped'],
    restarting: ['starting', 'stopped'],
  } as const;

  private setStatus(scriptId: string, next: RuntimeStatus): void {
    const managed = this.processes.get(scriptId);
    if (!managed) return;
    const current = managed.status;
    const allowed = ProcessManager.ALLOWED_TRANSITIONS[current] ?? [];
    if (current !== next && !allowed.includes(next)) {
      return; // ignore invalid transition
    }
    managed.status = next;
    if (next === 'starting') {
      managed.startTime = Date.now();
    }
    this.emitStatus(scriptId);
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
    // legacy path retained for reference; rotation handled by logger
    const settings = Storage.getSettings();
    const baseDir = settings.logsPath?.trim()
      ? settings.logsPath.trim()
      : path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    return path.join(baseDir, `${scriptId}.log`);
  }

  private broadcast(channel: string, payload: unknown): void {}

  private emitStatus(scriptId: string): void {
    const snap = this.snapshot(scriptId);
    if (snap) {
      const { eventBus } = require('./events');
      eventBus.send('process:status:event', snap);
    }
  }

  private writeLog(scriptId: string, text: string): void {
    const managed = this.processes.get(scriptId);
    if (!managed) return;
    // Mask secrets before writing
    const masked = maskTextWithSecrets(text, managed.secretValues ?? []);
    // Write via rotating log manager
    const { logManager } = require('./logger');
    logManager.write(scriptId, masked);
    const { eventBus } = require('./events');
    eventBus.send('process:log:event', { scriptId, text: masked });
  }

  private async sampleMetrics(): Promise<void> {
    for (const [id, p] of this.processes) {
      if (p.child?.pid && p.status === 'running') {
        try {
          p.metrics = await this.metricsSampler.sample(p.child.pid, p.startTime);
          // Health check optional
          const script = this.scripts().find((s) => s.id === id);
          if (script?.healthCheck) {
            const ok = await this.checkHealth(script.healthCheck);
            p.healthy = ok;
          } else {
            p.healthy = undefined;
          }
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
      healthy: p.healthy,
      backoffMs: p.backoffMs,
      nextRestartDelayMs: p.nextRestartAt ? Math.max(0, p.nextRestartAt - Date.now()) : undefined,
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
      this.setStatus(id, 'starting');

      const child = spawn(script.command, script.args ?? [], {
        cwd: script.cwd ?? process.cwd(),
        env: { ...process.env, ...(script.env ?? {}) },
        windowsHide: true,
        shell: false,
      });
      p!.child = child;
      p!.stopping = false;
      // detect secrets once per run
      try {
        p!.secretValues = detectSecretValues(script.env);
      } catch {
        p!.secretValues = [];
      }

      child.stdout.on('data', (buf: Buffer) => this.writeLog(id, buf.toString()))
        .setEncoding('utf-8');
      child.stderr.on('data', (buf: Buffer) => this.writeLog(id, buf.toString()))
        .setEncoding('utf-8');

      child.on('spawn', () => {
        this.setStatus(id, 'running');
      });
      child.on('error', (err) => {
        this.writeLog(id, `\n[error] ${err.message}\n`);
      });
      child.on('exit', async (code) => {
        p!.lastExitCode = code ?? null;
        p!.child = undefined;
        const wasStopping = p!.stopping === true;
        const next: RuntimeStatus = code === 0 ? 'stopped' : 'crashed';
        this.setStatus(id, next);
        // Native notification on crash with click-to-restart
        const settings = Storage.getSettings();
        const allowNative = settings.notificationsNativeEnabled ?? settings.notifications ?? true;
        if (p!.status === 'crashed' && Notification.isSupported() && allowNative) {
          const n = new Notification({
            title: 'Script crashed',
            body: `${script.name} exited with code ${code ?? 'unknown'}. Click to restart.`,
            silent: false,
          });
          n.on('click', () => {
            void this.restart(id);
          });
          n.show();
        }
        // Close log stream between runs
        const { logManager } = require('./logger');
        logManager.close(id);

        if (!wasStopping && (script.autoRestart || script.restartPolicy === 'always' || (script.restartPolicy === 'on-crash' && code !== 0))) {
          // backoff with cap
          const maxRetries = script.maxRetries ?? 5;
          if (maxRetries === -1 || p!.retries < maxRetries) {
            const abortController = new AbortController();
            const waitMs = computeBackoffDelayMs(p!.retries + 1, {
              baseMs: p!.backoffMs,
              factor: 2,
              maxMs: 30000,
              jitter: 'full',
            });
            p!.nextRestartAt = Date.now() + waitMs;
            this.emitStatus(id);
            // Store controller on managed proc to allow cancellation on stop
            (p as unknown as { backoffAbort?: AbortController }).backoffAbort = abortController;
            try {
              await waitFor(waitMs, abortController.signal);
            } catch {
              // canceled
              (p as unknown as { backoffAbort?: AbortController }).backoffAbort = undefined;
              p!.nextRestartAt = undefined;
              return;
            }
            (p as unknown as { backoffAbort?: AbortController }).backoffAbort = undefined;
            p!.retries += 1;
            const { eventBus } = require('./events');
            eventBus.send('process:restart:event', { scriptId: id, attempt: p!.retries });
            await this.start(id);
            p!.nextRestartAt = undefined;
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
    // Cancel any pending backoff wait
    const pending = (p as unknown as { backoffAbort?: AbortController }).backoffAbort;
    if (pending) pending.abort();
    return new Promise((resolve) => {
      treeKill(p.child!.pid!, 'SIGTERM', () => {
        // The 'exit' handler will adjust state
        resolve();
      });
    });
  }

  async restart(id: string): Promise<void> {
    this.setStatus(id, 'restarting');
    await this.stop(id);
    await this.start(id);
  }

  async killTree(id: string): Promise<void> {
    const p = this.processes.get(id);
    if (!p?.child?.pid) return;
    await new Promise<void>((resolve) => {
      treeKill(p.child!.pid!, 'SIGKILL', () => resolve());
    });
  }

  private async checkHealth(h: NonNullable<ScriptDefinition['healthCheck']>): Promise<boolean> {
    if (h.port) {
      const isOpen = await new Promise<boolean>((resolve) => {
        const socket = net.createConnection({ port: h.port! });
        socket.setTimeout(1000);
        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });
        socket.on('error', () => resolve(false));
      });
      if (!isOpen) return false;
    }
    if (h.url) {
      const client = h.url.startsWith('https') ? https : http;
      const ok = await new Promise<boolean>((resolve) => {
        const req = client.get(h.url!, (res) => {
          resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1500, () => {
          req.destroy();
          resolve(false);
        });
      });
      if (!ok) return false;
    }
    // command health check can be added later
    return true;
  }
}


