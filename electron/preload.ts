import { contextBridge, ipcRenderer } from 'electron';
import type { ScriptDefinition, Profile, AppSettings, RuntimeStateSnapshot } from '../src/shared/types';
import type { PersistedData } from '../src/shared/types';

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('process:ping') as Promise<string>,
  scripts: {
    list: () => ipcRenderer.invoke('scripts:list') as Promise<ScriptDefinition[]>,
    create: (input: Omit<ScriptDefinition, 'id'>) =>
      ipcRenderer.invoke('scripts:create', input) as Promise<ScriptDefinition>,
    upsert: (script: ScriptDefinition) =>
      ipcRenderer.invoke('scripts:upsert', script) as Promise<ScriptDefinition>,
    delete: (id: string) => ipcRenderer.invoke('scripts:delete', id) as Promise<void>,
  },
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list') as Promise<Profile[]>,
    upsert: (profile: Profile) => ipcRenderer.invoke('profiles:upsert', profile) as Promise<Profile>,
    delete: (id: string) => ipcRenderer.invoke('profiles:delete', id) as Promise<void>,
    startAll: (id: string) => ipcRenderer.invoke('profiles:startAll', id) as Promise<void>,
    stopAll: (id: string) => ipcRenderer.invoke('profiles:stopAll', id) as Promise<void>,
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get') as Promise<AppSettings>,
    update: (patch: Partial<AppSettings>) =>
      ipcRenderer.invoke('settings:update', patch) as Promise<AppSettings>,
  },
  data: {
    export: () => ipcRenderer.invoke('data:export') as Promise<PersistedData>,
    import: (payload: { data: PersistedData; mode: 'merge' | 'replace' }) =>
      ipcRenderer.invoke('data:import', payload) as Promise<PersistedData>,
  },
  
  process: {
    start: (id: string) => ipcRenderer.invoke('process:start', id) as Promise<void>,
    stop: (id: string) => ipcRenderer.invoke('process:stop', id) as Promise<void>,
    restart: (id: string) => ipcRenderer.invoke('process:restart', id) as Promise<void>,
    snapshot: (id: string) =>
      ipcRenderer.invoke('process:snapshot', id) as Promise<RuntimeStateSnapshot | undefined>,
    snapshots: () =>
      ipcRenderer.invoke('process:snapshots') as Promise<RuntimeStateSnapshot[] | undefined>,
    killTree: (id: string) => ipcRenderer.invoke('process:killTree', id) as Promise<void>,
    onStatus: (cb: (snap: RuntimeStateSnapshot) => void) => {
      const handler = (_: unknown, snap: RuntimeStateSnapshot) => cb(snap);
      ipcRenderer.on('process:status:event', handler);
      return () => ipcRenderer.off('process:status:event', handler);
    },
    onLog: (cb: (evt: { scriptId: string; text: string }) => void) => {
      const handler = (_: unknown, evt: { scriptId: string; text: string }) => cb(evt);
      ipcRenderer.on('process:log:event', handler);
      return () => ipcRenderer.off('process:log:event', handler);
    },
    onRestart: (cb: (evt: { scriptId: string; attempt: number }) => void) => {
      const handler = (_: unknown, evt: { scriptId: string; attempt: number }) => cb(evt);
      ipcRenderer.on('process:restart:event', handler);
      return () => ipcRenderer.off('process:restart:event', handler);
    },
    readLog: (id: string) => ipcRenderer.invoke('process:readLog', id) as Promise<string>,
    listLogs: (id: string) => ipcRenderer.invoke('process:listLogs', id) as Promise<
      { file: string; size: number; mtimeMs: number }[]
    >,
    readLogFile: (scriptId: string, file: string) =>
      ipcRenderer.invoke('process:readLogFile', { scriptId, file }) as Promise<string>,
  },
  updates: {
    check: () => ipcRenderer.invoke('updates:check') as Promise<{ ok: boolean; error?: string }>,
    download: () => ipcRenderer.invoke('updates:download') as Promise<{ ok: boolean; error?: string }>,
    quitAndInstall: () => ipcRenderer.invoke('updates:quitAndInstall') as Promise<void>,
    onEvent: (cb: (evt: { type: string; info?: unknown; message?: string }) => void) => {
      const handler = (_: unknown, evt: { type: string; info?: unknown; message?: string }) => cb(evt);
      ipcRenderer.on('updates:event', handler);
      return () => ipcRenderer.off('updates:event', handler);
    },
  },
});

declare global {
  interface Window {
    api: {
      ping: () => Promise<string>;
      scripts: {
        list: () => Promise<ScriptDefinition[]>;
        create: (input: Omit<ScriptDefinition, 'id'>) => Promise<ScriptDefinition>;
        upsert: (script: ScriptDefinition) => Promise<ScriptDefinition>;
        delete: (id: string) => Promise<void>;
      };
      profiles: {
        list: () => Promise<Profile[]>;
        upsert: (profile: Profile) => Promise<Profile>;
        delete: (id: string) => Promise<void>;
        startAll: (id: string) => Promise<void>;
        stopAll: (id: string) => Promise<void>;
      };
      settings: {
        get: () => Promise<AppSettings>;
        update: (patch: Partial<AppSettings>) => Promise<AppSettings>;
      };
      data: {
        export: () => Promise<PersistedData>;
        import: (payload: { data: PersistedData; mode: 'merge' | 'replace' }) => Promise<PersistedData>;
      };
      updates: {
        check: () => Promise<{ ok: boolean; error?: string }>;
        download: () => Promise<{ ok: boolean; error?: string }>;
        quitAndInstall: () => Promise<void>;
        onEvent: (cb: (evt: { type: string; info?: unknown; message?: string }) => void) => () => void;
      };
      process: {
        start: (id: string) => Promise<void>;
        stop: (id: string) => Promise<void>;
        restart: (id: string) => Promise<void>;
        snapshot: (id: string) => Promise<RuntimeStateSnapshot | undefined>;
        snapshots: () => Promise<RuntimeStateSnapshot[] | undefined>;
        killTree: (id: string) => Promise<void>;
        onStatus: (cb: (snap: RuntimeStateSnapshot) => void) => () => void;
        onLog: (cb: (evt: { scriptId: string; text: string }) => void) => () => void;
        onRestart: (cb: (evt: { scriptId: string; attempt: number }) => void) => () => void;
        readLog: (id: string) => Promise<string>;
        listLogs: (id: string) => Promise<{ file: string; size: number; mtimeMs: number }[]>;
        readLogFile: (scriptId: string, file: string) => Promise<string>;
      };
    };
  }
}


