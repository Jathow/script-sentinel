import type { PersistedData } from '../src/shared/types';

export interface Migration {
  from: number;
  to: number;
  migrate: (data: PersistedData) => PersistedData;
}

// No-op placeholder list; add real migrations here when schemaVersion increases
const migrations: Migration[] = [
  // Example template for future:
  // {
  //   from: 1,
  //   to: 2,
  //   migrate: (d) => ({ ...d, schemaVersion: 2 }),
  // },
];

export function applyMigrations(data: PersistedData): PersistedData {
  let working = data;
  let progressed = true;
  // Iterate as long as we can find a migration matching current version
  while (progressed) {
    progressed = false;
    const next = migrations.find((m) => m.from === working.schemaVersion);
    if (next) {
      working = next.migrate(working);
      progressed = true;
    }
  }
  return working;
}


