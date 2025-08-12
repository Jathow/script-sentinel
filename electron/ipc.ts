import { ipcMain } from 'electron';
import { Storage } from './storage';
import type { ScriptDefinition, Profile, AppSettings } from '../src/shared/types';

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
}


