import { describe, it, expect } from 'vitest';
import { computeBackoffDelayMs, waitFor, CancelError } from '../../electron/backoff';

describe('backoff', () => {
  it('computes exponential delay without jitter', () => {
    expect(computeBackoffDelayMs(1, { baseMs: 100, factor: 2, maxMs: 1000, jitter: 'none' })).toBe(100);
    expect(computeBackoffDelayMs(2, { baseMs: 100, factor: 2, maxMs: 1000, jitter: 'none' })).toBe(200);
    expect(computeBackoffDelayMs(3, { baseMs: 100, factor: 2, maxMs: 1000, jitter: 'none' })).toBe(400);
    expect(computeBackoffDelayMs(5, { baseMs: 100, factor: 2, maxMs: 300, jitter: 'none' })).toBe(300);
  });

  it('waitFor resolves and can be canceled', async () => {
    const ac = new AbortController();
    const p = waitFor(5, ac.signal);
    ac.abort();
    await expect(p).rejects.toBeInstanceOf(CancelError);
  });
});


