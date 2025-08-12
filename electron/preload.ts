import { contextBridge, ipcRenderer } from 'electron';
import type { ScriptDefinition, Profile, AppSettings } from '../src/shared/types';

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
    };
  }
}


