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
- data:seed → Promise<PersistedData>

## Process Control
- process:start (id: string) → Promise<void>
- process:stop (id: string) → Promise<void>
- process:restart (id: string) → Promise<void>
- process:snapshot (id: string) → Promise<RuntimeStateSnapshot | undefined>
- process:snapshots → Promise<RuntimeStateSnapshot[] | undefined>
- process:killTree (id: string) → Promise<void>
- process:readLog (id: string) → Promise<string>
- process:listLogs (id: string) → Promise<{ file: string; size: number; mtimeMs: number }[]>
- process:readLogFile ({ scriptId: string; file: string }) → Promise<string>
- process:testRun ({ command, args?, cwd?, env?, timeoutMs? }) → Promise<{ exitCode: number | null; stdout: string; stderr: string; timedOut: boolean; error?: string }>

## App Log
- appLog.read → Promise<string> (reads structured main-process app log)
- appLog.list → Promise<{ file: string; size: number; mtimeMs: number }[]>

Events:
- process:status:event (payload: RuntimeStateSnapshot)
  - Emitted on status/metrics/health updates
- process:log:event (payload: { scriptId: string; text: string })
  - Emitted on stdout/stderr chunks
  
Additional event:
- process:restart:event (payload: { scriptId: string; attempt: number })
  - Emitted before an automatic restart attempt
- security:permission:warn (payload: { scriptId: string; name: string; reason: string })
  - Emitted when a command likely requires elevated privileges

## Updates
- updates:check → Promise<{ ok: boolean; error?: string }>
- updates:download → Promise<{ ok: boolean; error?: string }>
- updates:quitAndInstall → Promise<void>

Events:
- updates:event
  - { type: 'available' | 'none' | 'progress' | 'downloaded' | 'error'; info?: unknown; message?: string }
- app:crash (payload: { kind: 'uncaughtException' | 'unhandledRejection'; message: string })
  - Emitted when the main process records an unhandled error

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


