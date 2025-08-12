# IPC Contract (Main ⇄ Renderer)

All channels are invoked from the sandboxed renderer via `window.api.*` exposed in `electron/preload.ts`.

Conventions
- Request/response use `ipcRenderer.invoke`/`ipcMain.handle`
- Events use `webContents.send` with `ipcRenderer.on`

## Health/Utility
- process:ping → Promise<string>
  - Returns 'pong' if IPC is alive

## Scripts
- scripts:list → Promise<ScriptDefinition[]>
- scripts:create (input: Omit<ScriptDefinition, 'id'>) → Promise<ScriptDefinition>
- scripts:upsert (script: ScriptDefinition) → Promise<ScriptDefinition>
- scripts:delete (id: string) → Promise<void>

## Profiles
- profiles:list → Promise<Profile[]>
- profiles:upsert (profile: Profile) → Promise<Profile>
- profiles:delete (id: string) → Promise<void>
- profiles:startAll (id: string) → Promise<void>
- profiles:stopAll (id: string) → Promise<void>

## Settings
- settings:get → Promise<AppSettings>
- settings:update (patch: Partial<AppSettings>) → Promise<AppSettings>

## Data Import/Export
- data:export → Promise<PersistedData>
- data:import ({ data: PersistedData, mode: 'merge' | 'replace' }) → Promise<PersistedData>

## Process Control
- process:start (id: string) → Promise<void>
- process:stop (id: string) → Promise<void>
- process:restart (id: string) → Promise<void>
- process:snapshot (id: string) → Promise<RuntimeStateSnapshot | undefined>
- process:snapshots → Promise<RuntimeStateSnapshot[] | undefined>
- process:killTree (id: string) → Promise<void>
- process:readLog (id: string) → Promise<string>

Events:
- process:status:event (payload: RuntimeStateSnapshot)
  - Emitted on status/metrics/health updates
- process:log:event (payload: { scriptId: string; text: string })
  - Emitted on stdout/stderr chunks

## Updates
- updates:check → Promise<{ ok: boolean; error?: string }>
- updates:download → Promise<{ ok: boolean; error?: string }>
- updates:quitAndInstall → Promise<void>

Events:
- updates:event
  - { type: 'available' | 'none' | 'progress' | 'downloaded' | 'error'; info?: unknown; message?: string }

## Types (summary)
- ScriptDefinition
  - id, name, command, args?, cwd?, env?, interpreter?
  - autoStart?, autoRestart?, restartPolicy?, backoffMs?, maxRetries?
  - healthCheck? ({ port?, url?, command? })
  - profiles?, log? (persist/rotate)
- RuntimeStateSnapshot
  - scriptId, pid?, status, startTime?, uptimeMs?, cpuPercent?, memMB?
  - lastExitCode?, retries?, healthy?, backoffMs?, nextRestartDelayMs?
- Profile: id, name, scriptIds[], autoStartOnLogin?
- AppSettings
  - theme?, notificationsNativeEnabled?, notificationsToastEnabled?
  - startMinimized?, updateChannel?, logsPath?, crashReportingEnabled?
- PersistedData
  - schemaVersion: 1, scripts[], profiles[], settings

This document reflects the current code in `electron/main.ts`, `electron/ipc.ts`, and `electron/preload.ts`.


