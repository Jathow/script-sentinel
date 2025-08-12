import pidusage from 'pidusage';

export type SampledMetrics = {
  cpuPercent?: number;
  memMB?: number;
  uptimeMs?: number;
};

export interface MetricsSampler {
  sample(pid: number, startTime?: number): Promise<SampledMetrics>;
}

export class PidUsageSampler implements MetricsSampler {
  async sample(pid: number, startTime?: number): Promise<SampledMetrics> {
    const stats = await pidusage(pid);
    const uptimeMs = startTime ? Date.now() - startTime : undefined;
    return {
      cpuPercent: stats.cpu,
      memMB: stats.memory / (1024 * 1024),
      uptimeMs,
    };
  }
}

export class NoopSampler implements MetricsSampler {
  async sample(): Promise<SampledMetrics> {
    return {};
  }
}


