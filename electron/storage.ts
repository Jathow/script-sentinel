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

function isScriptDefinition(obj: unknown): obj is ScriptDefinition {
  if (!obj || typeof obj !== 'object') return false;
  const s = obj as ScriptDefinition;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.command === 'string'
  );
}

function isProfile(obj: unknown): obj is Profile {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Profile;
  return typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.scriptIds);
}

function validatePersistedData(data: PersistedData): void {
  if (!data || typeof data !== 'object') throw new Error('Invalid data payload');
  if (Number((data as unknown as { schemaVersion: unknown }).schemaVersion) !== 1)
    throw new Error('Unsupported schema version');
  if (!Array.isArray(data.scripts) || !Array.isArray(data.profiles)) {
    throw new Error('Invalid data structure');
  }
  for (const s of data.scripts) {
    if (!isScriptDefinition(s)) throw new Error('Invalid script entry');
  }
  for (const p of data.profiles) {
    if (!isProfile(p)) throw new Error('Invalid profile entry');
  }
}

function scriptsEqual(a: ScriptDefinition, b: ScriptDefinition): boolean {
  return (
    a.name === b.name &&
    a.command === b.command &&
    JSON.stringify(a.args ?? []) === JSON.stringify(b.args ?? []) &&
    (a.cwd ?? '') === (b.cwd ?? '') &&
    JSON.stringify(a.env ?? {}) === JSON.stringify(b.env ?? {}) &&
    (a.restartPolicy ?? 'on-crash') === (b.restartPolicy ?? 'on-crash')
  );
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
    validatePersistedData(newData);
    if (mode === 'replace') {
      return writeAll(newData);
    }
    // merge with conflict resolution
    return writeData((d) => {
      // settings: shallow merge
      d.settings = { ...d.settings, ...(newData.settings ?? {}) };

      // Build existing indices
      const existingById = new Map(d.scripts.map((s) => [s.id, s] as const));
      const existingNames = new Set(d.scripts.map((s) => s.name));

      for (const incoming of newData.scripts ?? []) {
        const current = existingById.get(incoming.id);
        if (!current) {
          // no id conflict, add (ensure unique name)
          let name = incoming.name;
          let i = 1;
          while (existingNames.has(name)) {
            name = `${incoming.name} (${++i})`;
          }
          const toAdd = { ...incoming, name };
          d.scripts.push(toAdd);
          existingById.set(toAdd.id, toAdd);
          existingNames.add(name);
        } else if (!scriptsEqual(current, incoming)) {
          // id conflict with different content -> keep existing, add a duplicated entry with new id
          let name = `${incoming.name} (imported)`;
          let i = 1;
          while (existingNames.has(name)) {
            name = `${incoming.name} (imported ${++i})`;
          }
          const clone: ScriptDefinition = { ...incoming, id: randomUUID(), name };
          d.scripts.push(clone);
          existingById.set(clone.id, clone);
          existingNames.add(name);
        } // else identical, skip
      }

      // profiles: merge by id; drop references to missing scripts
      const profById = new Map(d.profiles.map((p) => [p.id, p] as const));
      for (const p of newData.profiles ?? []) {
        if (!profById.has(p.id)) {
          profById.set(p.id, { ...p, scriptIds: p.scriptIds.filter((sid) => existingById.has(sid)) });
        } else {
          const merged: Profile = {
            ...profById.get(p.id)!,
            name: profById.get(p.id)!.name, // keep existing name
            scriptIds: Array.from(
              new Set([
                ...profById.get(p.id)!.scriptIds,
                ...p.scriptIds.filter((sid) => existingById.has(sid)),
              ]),
            ),
            autoStartOnLogin: profById.get(p.id)!.autoStartOnLogin || p.autoStartOnLogin,
          };
          profById.set(p.id, merged);
        }
      }
      d.profiles = Array.from(profById.values());
    });
  },
};


