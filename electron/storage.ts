import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import type { PersistedData, ScriptDefinition, Profile, AppSettings } from '../src/shared/types';

const DATA_FILE = path.join(app.getPath('userData'), 'data.json');

const DEFAULT_DATA: PersistedData = {
  schemaVersion: 1,
  scripts: [
    {
      id: randomUUID(),
      name: 'Echo Heartbeat',
      description: 'Simple periodic echo to demonstrate logs',
      command: process.platform === 'win32' ? 'pwsh' : 'bash',
      args:
        process.platform === 'win32'
          ? ['-NoProfile', '-Command', 'while($true){Write-Output "beat"; Start-Sleep -Seconds 2}']
          : ['-lc', 'while true; do echo beat; sleep 2; done'],
      autoStart: false,
      autoRestart: true,
      restartPolicy: 'always',
      backoffMs: 1000,
      maxRetries: -1,
      interpreter: 'other',
    },
  ],
  profiles: [],
  settings: { theme: 'dark', notifications: true, startMinimized: false, updateChannel: 'stable' },
};

export function ensureDataFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
}

export function readData(): PersistedData {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const data = JSON.parse(raw) as PersistedData;
  return data;
}

export function writeData(mutator: (d: PersistedData) => void): PersistedData {
  const data = readData();
  mutator(data);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  return data;
}

export function writeAll(data: PersistedData): PersistedData {
  // naive validation
  if (data && typeof data === 'object' && data.schemaVersion === 1) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return data;
  }
  throw new Error('Invalid data format');
}

export const Storage = {
  listScripts(): ScriptDefinition[] {
    return readData().scripts;
  },
  upsertScript(script: ScriptDefinition): ScriptDefinition {
    return writeData((d) => {
      const idx = d.scripts.findIndex((s) => s.id === script.id);
      if (idx === -1) d.scripts.push(script);
      else d.scripts[idx] = script;
    }).scripts.find((s) => s.id === script.id)!;
  },
  createScript(input: Omit<ScriptDefinition, 'id'>): ScriptDefinition {
    const newScript: ScriptDefinition = { id: randomUUID(), ...input };
    writeData((d) => d.scripts.push(newScript));
    return newScript;
  },
  deleteScript(id: string): void {
    writeData((d) => (d.scripts = d.scripts.filter((s) => s.id !== id)));
  },

  listProfiles(): Profile[] {
    return readData().profiles;
  },
  upsertProfile(profile: Profile): Profile {
    return writeData((d) => {
      const idx = d.profiles.findIndex((p) => p.id === profile.id);
      if (idx === -1) d.profiles.push(profile);
      else d.profiles[idx] = profile;
    }).profiles.find((p) => p.id === profile.id)!;
  },
  deleteProfile(id: string): void {
    writeData((d) => (d.profiles = d.profiles.filter((p) => p.id !== id)));
  },

  getSettings(): AppSettings {
    return readData().settings;
  },
  updateSettings(patch: Partial<AppSettings>): AppSettings {
    return writeData((d) => {
      d.settings = { ...d.settings, ...patch };
    }).settings;
  },
  exportAll(): PersistedData {
    return readData();
  },
  importAll(newData: PersistedData, mode: 'merge' | 'replace' = 'merge'): PersistedData {
    if (mode === 'replace') {
      return writeAll(newData);
    }
    // merge
    return writeData((d) => {
      // settings overwrite wholesale
      d.settings = newData.settings ?? d.settings;
      // scripts merge by id
      const byId = new Map(d.scripts.map((s) => [s.id, s] as const));
      for (const s of newData.scripts ?? []) {
        byId.set(s.id, s);
      }
      d.scripts = Array.from(byId.values());
      // profiles merge by id
      const profById = new Map(d.profiles.map((p) => [p.id, p] as const));
      for (const p of newData.profiles ?? []) {
        profById.set(p.id, p);
      }
      d.profiles = Array.from(profById.values());
    });
  },
};


