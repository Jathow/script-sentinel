import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { Storage } from './storage';

type StreamInfo = { stream: fs.WriteStream; size: number };
export type LogMeta = { file: string; size: number; mtimeMs: number };

class LogManager {
  private streams = new Map<string, StreamInfo>();
  private readonly maxBytes: number = 5 * 1024 * 1024; // 5MB
  private readonly maxFiles: number = 5; // keep current + 4 rotated

  private getLogsDir(): string {
    const settings = Storage.getSettings();
    const baseDir = settings.logsPath?.trim()
      ? settings.logsPath.trim()
      : path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    return baseDir;
  }

  private getCurrentLogPath(scriptId: string): string {
    return path.join(this.getLogsDir(), `${scriptId}.log`);
  }

  private ensureStream(scriptId: string): StreamInfo {
    const existing = this.streams.get(scriptId);
    if (existing) return existing;
    const filePath = this.getCurrentLogPath(scriptId);
    const size = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
    const stream = fs.createWriteStream(filePath, { flags: 'a' });
    const info: StreamInfo = { stream, size };
    this.streams.set(scriptId, info);
    return info;
  }

  private rotate(scriptId: string): void {
    // Close current stream
    const current = this.streams.get(scriptId);
    if (current) {
      current.stream.end();
      this.streams.delete(scriptId);
    }
    const dir = this.getLogsDir();
    // Shift older files up to maxFiles-1
    for (let i = this.maxFiles - 1; i >= 1; i -= 1) {
      const from = path.join(dir, `${scriptId}.log.${i}`);
      const to = path.join(dir, `${scriptId}.log.${i + 1}`);
      if (fs.existsSync(from)) {
        try { fs.renameSync(from, to); } catch { /* ignore */ }
      }
    }
    // Move current log to .1
    const currPath = this.getCurrentLogPath(scriptId);
    const firstRotated = path.join(dir, `${scriptId}.log.1`);
    if (fs.existsSync(currPath)) {
      try { fs.renameSync(currPath, firstRotated); } catch { /* ignore */ }
    }
    // Remove oldest beyond retention
    const oldest = path.join(dir, `${scriptId}.log.${this.maxFiles + 1}`);
    if (fs.existsSync(oldest)) {
      try { fs.unlinkSync(oldest); } catch { /* ignore */ }
    }
    // Reopen stream fresh and reset size
    this.ensureStream(scriptId);
    const info = this.streams.get(scriptId);
    if (info) info.size = 0;
  }

  write(scriptId: string, text: string): void {
    const info = this.ensureStream(scriptId);
    const chunk = Buffer.from(text, 'utf-8');
    // rotate when current exceeds maxBytes
    if (info.size + chunk.length > this.maxBytes) {
      this.rotate(scriptId);
    }
    const refreshed = this.ensureStream(scriptId);
    refreshed.stream.write(chunk);
    refreshed.size += chunk.length;
  }

  close(scriptId: string): void {
    const info = this.streams.get(scriptId);
    if (!info) return;
    try { info.stream.end(); } catch { /* ignore */ }
    this.streams.delete(scriptId);
  }

  list(scriptId: string): LogMeta[] {
    const dir = this.getLogsDir();
    const prefix = `${scriptId}.log`;
    const metas: LogMeta[] = [];
    const addMeta = (file: string) => {
      try {
        const stat = fs.statSync(path.join(dir, file));
        metas.push({ file, size: stat.size, mtimeMs: stat.mtimeMs });
      } catch { /* ignore */ }
    };
    // current file first
    if (fs.existsSync(path.join(dir, prefix))) addMeta(prefix);
    // rotated files
    const files = fs.readdirSync(dir).filter((f) => f.startsWith(`${prefix}.`));
    for (const f of files) addMeta(f);
    // sort newest first by mtime
    metas.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return metas;
  }

  read(scriptId: string, file: string): string {
    const dir = this.getLogsDir();
    const base = file === 'current' ? `${scriptId}.log` : file;
    // prevent path traversal
    if (!base.startsWith(`${scriptId}.log`)) return '';
    const target = path.join(dir, base);
    try {
      return fs.existsSync(target) ? fs.readFileSync(target, 'utf-8') : '';
    } catch {
      return '';
    }
  }
}

export const logManager = new LogManager();


