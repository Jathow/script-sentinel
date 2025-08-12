import { ipcMain } from 'electron';
import { Storage } from './storage';
import { ProcessManager } from './processManager';
import type { ScriptDefinition, Profile, AppSettings } from '../src/shared/types';

let pm: ProcessManager | null = null;

export function registerIpcHandlers(): void {
  // Scripts
  ipcMain.handle('scripts:list', () => Storage.listScripts());
  ipcMain.handle('scripts:create', (_e, input: Omit<ScriptDefinition, 'id'>) =>
    Storage.createScript(input),
  );
  ipcMain.handle('scripts:upsert', (_e, script: ScriptDefinition) => Storage.upsertScript(script));
  ipcMain.handle('scripts:delete', (_e, id: string) => Storage.deleteScript(id));

  // Profiles
  ipcMain.handle('profiles:list', () => Storage.listProfiles());
  ipcMain.handle('profiles:upsert', (_e, profile: Profile) => Storage.upsertProfile(profile));
  ipcMain.handle('profiles:delete', (_e, id: string) => Storage.deleteProfile(id));

  // Settings
  ipcMain.handle('settings:get', () => Storage.getSettings());
  ipcMain.handle('settings:update', (_e, patch: Partial<AppSettings>) => Storage.updateSettings(patch));

  // Process control
  ipcMain.handle('process:start', async (_e, id: string) => pm?.start(id));
  ipcMain.handle('process:stop', async (_e, id: string) => pm?.stop(id));
  ipcMain.handle('process:restart', async (_e, id: string) => pm?.restart(id));
  ipcMain.handle('process:snapshot', (_e, id: string) => pm?.snapshot(id));
  ipcMain.handle('process:snapshots', () => pm?.listSnapshots());
}

export function createProcessManager(): ProcessManager {
  pm = new ProcessManager(() => Storage.listScripts());
  pm.init();
  return pm;
}


