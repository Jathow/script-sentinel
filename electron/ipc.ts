import { ipcMain } from 'electron';
import { Storage } from './storage';
import type { PersistedData } from '../src/shared/types';
import { ProcessManager } from './processManager';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { ScriptDefinition, Profile, AppSettings } from '../src/shared/types';
import { logManager } from './logger';

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
  ipcMain.handle('profiles:startAll', async (_e, id: string) => {
    const profile = Storage.listProfiles().find((p) => p.id === id);
    const scripts = profile?.scriptIds ?? [];
    await Promise.all(scripts.map((sid) => pm?.start(sid)));
  });
  ipcMain.handle('profiles:stopAll', async (_e, id: string) => {
    const profile = Storage.listProfiles().find((p) => p.id === id);
    const scripts = profile?.scriptIds ?? [];
    await Promise.all(scripts.map((sid) => pm?.stop(sid)));
  });

  // Settings
  ipcMain.handle('settings:get', () => Storage.getSettings());
  ipcMain.handle('settings:update', (_e, patch: Partial<AppSettings>) => Storage.updateSettings(patch));
  ipcMain.handle('data:export', () => Storage.exportAll());
  ipcMain.handle('data:import', (_e, payload: { data: PersistedData; mode: 'merge' | 'replace' }) =>
    Storage.importAll(payload.data, payload.mode),
  );

  // Process control
  ipcMain.handle('process:start', async (_e, id: string) => pm?.start(id));
  ipcMain.handle('process:stop', async (_e, id: string) => pm?.stop(id));
  ipcMain.handle('process:restart', async (_e, id: string) => pm?.restart(id));
  ipcMain.handle('process:snapshot', (_e, id: string) => pm?.snapshot(id));
  ipcMain.handle('process:snapshots', () => pm?.listSnapshots());
  ipcMain.handle('process:killTree', async (_e, id: string) => pm?.killTree(id));

  // Logs
  ipcMain.handle('process:readLog', async (_e, scriptId: string) => {
    // return current log content
    return logManager.read(scriptId, 'current');
  });
  ipcMain.handle('process:listLogs', async (_e, scriptId: string) => {
    return logManager.list(scriptId);
  });
  ipcMain.handle('process:readLogFile', async (_e, payload: { scriptId: string; file: string }) => {
    return logManager.read(payload.scriptId, payload.file);
  });
}

export function createProcessManager(): ProcessManager {
  pm = new ProcessManager(() => Storage.listScripts());
  pm.init();
  return pm;
}


