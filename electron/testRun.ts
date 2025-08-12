import { spawn } from 'node:child_process';

export interface TestRunInput {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number; // default 8000
}

export interface TestRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  error?: string;
}

export function testRun(input: TestRunInput): Promise<TestRunResult> {
  const timeoutMs = Math.max(1000, input.timeoutMs ?? 8000);
  return new Promise<TestRunResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    try {
      const child = spawn(input.command, input.args ?? [], {
        cwd: input.cwd ?? process.cwd(),
        env: { ...process.env, ...(input.env ?? {}) },
        windowsHide: true,
        shell: false,
      });

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { child.kill('SIGKILL'); } catch { /* ignore */ }
        resolve({ exitCode: null, stdout, stderr, timedOut: true });
      }, timeoutMs);

      child.stdout.setEncoding('utf-8').on('data', (d: string) => {
        stdout += d;
      });
      child.stderr.setEncoding('utf-8').on('data', (d: string) => {
        stderr += d;
      });

      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ exitCode: null, stdout, stderr, timedOut: false, error: err.message });
      });

      child.on('exit', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ exitCode: code ?? null, stdout, stderr, timedOut: false });
      });
    } catch (e) {
      if (settled) return;
      settled = true;
      resolve({ exitCode: null, stdout, stderr, timedOut: false, error: (e as Error).message });
    }
  });
}


