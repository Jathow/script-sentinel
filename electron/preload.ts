import { contextBridge, ipcRenderer } from 'electron';
import type { ScriptDefinition, Profile, AppSettings, RuntimeStateSnapshot } from '../src/shared/types';

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
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get') as Promise<AppSettings>,
    update: (patch: Partial<AppSettings>) =>
      ipcRenderer.invoke('settings:update', patch) as Promise<AppSettings>,
  },
  process: {
    start: (id: string) => ipcRenderer.invoke('process:start', id) as Promise<void>,
    stop: (id: string) => ipcRenderer.invoke('process:stop', id) as Promise<void>,
    restart: (id: string) => ipcRenderer.invoke('process:restart', id) as Promise<void>,
    snapshot: (id: string) =>
      ipcRenderer.invoke('process:snapshot', id) as Promise<RuntimeStateSnapshot | undefined>,
    snapshots: () =>
      ipcRenderer.invoke('process:snapshots') as Promise<RuntimeStateSnapshot[] | undefined>,
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
      };
      settings: {
        get: () => Promise<AppSettings>;
        update: (patch: Partial<AppSettings>) => Promise<AppSettings>;
      };
      process: {
        start: (id: string) => Promise<void>;
        stop: (id: string) => Promise<void>;
        restart: (id: string) => Promise<void>;
        snapshot: (id: string) => Promise<RuntimeStateSnapshot | undefined>;
        snapshots: () => Promise<RuntimeStateSnapshot[] | undefined>;
        onStatus: (cb: (snap: RuntimeStateSnapshot) => void) => () => void;
        onLog: (cb: (evt: { scriptId: string; text: string }) => void) => () => void;
      };
    };
  }
}


