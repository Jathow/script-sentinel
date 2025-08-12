import { ipcMain } from 'electron';
import { Storage } from './storage';
import type { PersistedData } from '../src/shared/types';
import { ProcessManager } from './processManager';
import { PidUsageSampler } from './metrics';
import { testRun } from './testRun';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { ScriptDefinition, Profile, AppSettings } from '../src/shared/types';
import { logManager } from './logger';
import { assertProfileExists, assertScriptExists, assertString, sanitizeSettingsPatch, assertRecordStringString, assertStringArray, isPlainObject } from './validate';

let pm: ProcessManager | null = null;

export function registerIpcHandlers(): void {
  // Scripts
  ipcMain.handle('scripts:list', () => Storage.listScripts());
  ipcMain.handle('scripts:create', (_e, input: Omit<ScriptDefinition, 'id'>) => {
    if (!isPlainObject(input)) throw new Error('Invalid script payload');
    assertString(input.name, 'name');
    assertString(input.command, 'command');
    if (input.args) assertStringArray(input.args, 'args');
    if (input.cwd) assertString(input.cwd, 'cwd');
    if (input.env) assertRecordStringString(input.env, 'env');
    return Storage.createScript(input as Omit<ScriptDefinition, 'id'>);
  });
  ipcMain.handle('scripts:upsert', (_e, script: ScriptDefinition) => {
    if (!isPlainObject(script)) throw new Error('Invalid script payload');
    assertString(script.id, 'id');
    assertString(script.name, 'name');
    assertString(script.command, 'command');
    if (script.args) assertStringArray(script.args, 'args');
    if (script.cwd) assertString(script.cwd, 'cwd');
    if (script.env) assertRecordStringString(script.env, 'env');
    return Storage.upsertScript(script as ScriptDefinition);
  });
  ipcMain.handle('scripts:delete', (_e, id: string) => Storage.deleteScript(assertScriptExists(id).id));

  // Profiles
  ipcMain.handle('profiles:list', () => Storage.listProfiles());
  ipcMain.handle('profiles:upsert', (_e, profile: Profile) => {
    if (!isPlainObject(profile)) throw new Error('Invalid profile payload');
    assertString(profile.id, 'id');
    assertString(profile.name, 'name');
    assertStringArray(profile.scriptIds ?? [], 'scriptIds');
    return Storage.upsertProfile(profile as Profile);
  });
  ipcMain.handle('profiles:delete', (_e, id: string) => Storage.deleteProfile(assertProfileExists(id).id));
  ipcMain.handle('profiles:startAll', async (_e, id: string) => {
    const profile = assertProfileExists(id);
    const scripts = profile.scriptIds ?? [];
    await Promise.all(scripts.map((sid) => pm?.start(sid)));
  });
  ipcMain.handle('profiles:stopAll', async (_e, id: string) => {
    const profile = assertProfileExists(id);
    const scripts = profile.scriptIds ?? [];
    await Promise.all(scripts.map((sid) => pm?.stop(sid)));
  });

  // Settings
  ipcMain.handle('settings:get', () => Storage.getSettings());
  ipcMain.handle('settings:update', (_e, patch: Partial<AppSettings>) => Storage.updateSettings(sanitizeSettingsPatch(patch)));
  ipcMain.handle('data:export', () => Storage.exportAll());
  ipcMain.handle('data:import', (_e, payload: { data: PersistedData; mode: 'merge' | 'replace' }) =>
    Storage.importAll(payload.data, payload.mode),
  );
  ipcMain.handle('data:seed', () => Storage.seedDefaults());

  // Process control
  ipcMain.handle('process:start', async (_e, id: string) => pm?.start(assertScriptExists(id).id));
  ipcMain.handle('process:stop', async (_e, id: string) => pm?.stop(assertScriptExists(id).id));
  ipcMain.handle('process:restart', async (_e, id: string) => pm?.restart(assertScriptExists(id).id));
  ipcMain.handle('process:snapshot', (_e, id: string) => pm?.snapshot(assertScriptExists(id).id));
  ipcMain.handle('process:snapshots', () => pm?.listSnapshots());
  ipcMain.handle('process:killTree', async (_e, id: string) => pm?.killTree(id));
  ipcMain.handle('process:testRun', async (_e, payload: { command: string; args?: string[]; cwd?: string; env?: Record<string, string>; timeoutMs?: number }) => {
    return testRun(payload);
  });

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
  pm = new ProcessManager(() => Storage.listScripts(), new PidUsageSampler());
  pm.init();
  return pm;
}


