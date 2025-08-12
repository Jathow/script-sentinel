export type JitterMode = 'none' | 'full';

export interface BackoffOptions {
  baseMs?: number; // initial delay base
  factor?: number; // exponential growth factor
  maxMs?: number;  // cap for delay
  jitter?: JitterMode; // apply jitter to spread retries
}

export class CancelError extends Error {
  constructor(message = 'Canceled') {
    super(message);
    this.name = 'CancelError';
  }
}

export function computeBackoffDelayMs(
  attemptNumber: number,
  opts: BackoffOptions = {},
): number {
  const baseMs = Math.max(1, opts.baseMs ?? 1000);
  const factor = Math.max(1, opts.factor ?? 2);
  const maxMs = Math.max(baseMs, opts.maxMs ?? 30000);
  const jitter = opts.jitter ?? 'full';

  const raw = Math.min(maxMs, Math.floor(baseMs * Math.pow(factor, Math.max(0, attemptNumber - 1))));
  if (jitter === 'full') {
    return Math.floor(Math.random() * (raw + 1));
  }
  return raw;
}

export function waitFor(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new CancelError());
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, Math.max(0, ms));

    const onAbort = () => {
      cleanup();
      reject(new CancelError());
    };

    const cleanup = () => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}


