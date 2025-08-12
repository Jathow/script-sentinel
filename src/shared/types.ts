export type RestartPolicy = 'always' | 'on-crash' | 'never';

export interface ScriptDefinition {
  id: string;
  name: string;
  description?: string;
  command: string; // e.g., node, python, pwsh, bash, or absolute exe
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  interpreter?: 'node' | 'python' | 'pwsh' | 'bash' | 'exe' | 'other';
  autoStart?: boolean;
  autoRestart?: boolean;
  restartPolicy?: RestartPolicy;
  backoffMs?: number; // base backoff
  maxRetries?: number; // -1 for unlimited
  healthCheck?: {
    port?: number;
    url?: string;
    command?: string;
  };
  profiles?: string[]; // profile ids
  log?: {
    captureStdout?: boolean;
    captureStderr?: boolean;
    persist?: boolean;
    path?: string;
    rotate?: { maxSizeMB?: number; maxFiles?: number };
  };
}

export type RuntimeStatus = 'running' | 'starting' | 'stopped' | 'crashed' | 'restarting';

export interface RuntimeStateSnapshot {
  scriptId: string;
  pid?: number;
  status: RuntimeStatus;
  startTime?: number; // epoch ms
  uptimeMs?: number;
  cpuPercent?: number;
  memMB?: number;
  lastExitCode?: number | null;
  retries?: number;
  healthy?: boolean;
  backoffMs?: number;
  nextRestartDelayMs?: number;
}

export interface Profile {
  id: string;
  name: string;
  scriptIds: string[];
  autoStartOnLogin?: boolean;
}

export interface AppSettings {
  theme?: 'dark' | 'system';
  notifications?: boolean; // legacy global toggle
  notificationsNativeEnabled?: boolean;
  notificationsToastEnabled?: boolean;
  startMinimized?: boolean;
  updateChannel?: 'stable' | 'beta';
  logsPath?: string;
  crashReportingEnabled?: boolean;
}

export interface PersistedData {
  schemaVersion: 1;
  scripts: ScriptDefinition[];
  profiles: Profile[];
  settings: AppSettings;
}


