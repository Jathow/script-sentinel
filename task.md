## Script Manager – Project Plan and Task Breakdown

### Vision
Build a modern, dark-themed desktop application to centrally manage personal scripts: start/stop, monitor status, auto-restart on crash, view logs, and automatically launch selected scripts on system startup. It should look like a sleek, complex server console and be resume-ready.

### Success Criteria
- **One-click control**: Start/stop/restart scripts individually or in groups.
- **Live status**: Clear running/stopped/crashed states with health indicators.
- **Auto-restart**: Configurable restart policy with backoff, max retries, and alerts.
- **Boot profiles**: Restore selected scripts on system startup.
- **Logs**: Real-time tail with filtering/search and persistent log history.
- **Polished UI**: Dark, modern “server room” theme with responsive layout.
- **Installer**: Windows installer with auto-start option and auto-update.

### Target Platform and Stack
- **OS**: Windows 10/11 (primary). Future-friendly for macOS/Linux if needed.
- **Runtime**: Electron (Node.js + Chromium) for desktop app.
- **Frontend**: React + Vite + TypeScript + Tailwind CSS (or shadcn/ui) for fast, modern UI.
- **Process Mgmt**: Node `child_process` with `pidusage` for CPU/RAM; `tree-kill` for cross-platform termination.
- **Data**: SQLite via `better-sqlite3` (or LiteFS) for reliable local storage. Alternative: JSON for MVP.
- **IPC**: Electron IPCMain/IPCRenderer for safe process control from UI.
- **Packaging**: `electron-builder` for NSIS installer, auto-update.
- **Notifications**: Electron native notifications + tray icon.

### Core Entities (Data Model)
- **Script**
  - `id` (uuid), `name`, `description`
  - `command` (e.g., `node`, `python`, `pwsh`, `bash`, or direct executable)
  - `args[]`, `cwd`, `env{}`, `interpreter` (enum)
  - `autoStart` (bool), `autoRestart` (bool)
  - `restartPolicy` ("always" | "on-crash" | "never"), `backoffMs`, `maxRetries`
  - `healthCheck` (optional: port, http url, or command)
  - `profiles[]` (start groups)
  - `log` settings: `captureStdout`/`stderr`, `persist`, `path`, `rotate`
- **RuntimeState** (derived)
  - `pid`, `status` (running | starting | stopped | crashed | restarting)
  - `startTime`, `uptimeMs`, `cpu%`, `memMB`, `lastExitCode`, `retries`
- **Profile**: `id`, `name`, `scriptIds[]`, `autoStartOnLogin` (bool)
- **Settings**: theme, notifications, update channel, start minimized, tray behavior

### Architecture Overview
- **Electron Main Process**: Owns the process manager, IPC API, system tray, auto-launch, updates, notifications.
- **Renderer (React UI)**: Dashboard, script cards, detail drawer, logs, settings.
- **Process Manager Module**: Spawns/monitors processes, handles backoff/retries, emits events (status/logs/metrics), persists state snapshots.
- **Persistence Layer**: DAO for scripts, profiles, settings, and log index; file-backed logs with rotation.

### UX and Visual Design
- **Theme**: Dark slate, neon accents (green/cyan/purple), subtle glows, glassmorphism panels.
- **Dashboard**: Grid of “server cards” per script with status LEDs, CPU/RAM mini-meters, quick actions.
- **Script Detail**: Slide-over drawer with controls, environment/config, live log stream with search.
- **Profiles Sidebar**: Create/rename profiles; one-click start/stop all in profile.
- **Global Toolbar**: Start selected, stop all, add script, filter/search.
- **Notifications**: Crash alerts with “Restart” action; toasts + native notifications.

---

## Milestones and Tasks

### M0 — Project Scaffolding (Day 0.5 – 1)
- [x] Initialize repository and workspace structure.
- [x] Set up Electron + Vite + React + TypeScript + Tailwind.
- [x] Configure ESLint, Prettier, Husky (pre-commit).
- [x] Add basic Electron main/renderer IPC scaffold.
- [x] Add dark theme base, fonts, and color tokens.
- [x] CI: GitHub Actions for build/test/lint.

Acceptance: App launches to a placeholder dashboard; dark theme applied; CI green.

Status: Completed. Verified by successful typecheck, lint, and production build. Dev server started; IPC ping returns ‘pong’ in UI header.

 

### M1 — Data Model and Persistence (Day 1 – 2)
- [ ] Define TypeScript types for `Script`, `RuntimeState`, `Profile`, `Settings`.
- [ ] Implement SQLite schema and migrations (or JSON as interim).
- [ ] Create DAO layer with CRUD for scripts/profiles/settings.
- [ ] Seed with sample scripts and a default profile.

Acceptance: CRUD operations work via dev console; data persists across restarts.

### M2 — Process Manager (Day 2 – 4)
- [ ] Implement spawn/kill using `child_process.spawn` with env, cwd, args.
- [ ] Capture stdout/stderr; stream to log files and IPC to renderer.
- [ ] Track `pid`, `status`, `startTime`, `uptime`, exit codes.
- [ ] Auto-restart policy with exponential backoff and `maxRetries`.
- [ ] Integrate `pidusage` polling for CPU/memory.
- [ ] Tree termination using `tree-kill` on stop.
- [ ] Health checks (basic): exit code and optional port probe.
- [ ] Emit process events over IPC with robust types.

Acceptance: Start/stop/restart works; crash triggers auto-restart per policy; metrics visible in logs.

### M3 — UI: Dashboard and Script Cards (Day 4 – 6)
- [ ] Dashboard grid of script cards with status LEDs and quick actions.
- [ ] Per-card metrics mini-charts (CPU/mem sparkline or compact bars).
- [ ] Bulk selection and actions (start/stop/restart).
- [ ] Global search/filter by name/status/profile.
- [ ] Empty state and loading skeletons.

Acceptance: Users can start/stop scripts from cards; status/metrics update live.

### M4 — UI: Script Detail and Logs (Day 6 – 8)
- [ ] Slide-over drawer with full details: command, args, env, cwd.
- [ ] Real-time logs with tailing, pause, search, and level/colorization.
- [ ] Download logs; log rotation settings.
- [ ] Display retry/backoff info and last exit code; manual “kill tree” action.

Acceptance: Logs stream in real time and can be searched; details editable and saved.

### M5 — Profiles and Auto-Start (Day 8 – 9)
- [ ] Profiles CRUD; assign scripts to profiles.
- [ ] Start/stop all scripts in a profile; profile status summary.
- [ ] On app start: auto-start scripts in profiles with `autoStartOnLogin`.
- [ ] Windows auto-launch on login (registry or `electron-builder` option).

Acceptance: Toggling profile auto-start launches scripts next reboot; bulk actions functional.

### M6 — Alerts, Notifications, and Tray (Day 9 – 10)
- [ ] Native notifications on crash/stop with quick actions.
- [ ] In-app toasts and alert center with history.
- [ ] System tray: quick start/stop recent scripts, open app, quit.
- [ ] Settings for notification preferences.

Acceptance: Crashes produce actionable alerts; tray provides basic controls.

### M7 — Settings and Import/Export (Day 10 – 11)
- [ ] Global settings page: theme, start minimized, update channel, logs path.
- [ ] Import/export scripts/profiles/settings to JSON.
- [ ] Validation and conflict resolution on import.

Acceptance: Settings persist; import/export round-trip works.

### M8 — Polish, Theming, and Performance (Day 11 – 12)
- [ ] Visual polish: neon accents, subtle glows, key animations.
- [ ] Keyboard shortcuts for common actions.
- [ ] Virtualized lists/logs for performance with many lines/scripts.
- [ ] Accessibility pass: focus states, aria labels, color contrast.

Acceptance: Stable 60fps interactions; no obvious perf or a11y issues.

### M9 — Packaging, Updates, and Release (Day 12 – 13)
- [ ] Configure `electron-builder` NSIS installer with code signing (if available).
- [ ] Auto-update channel with release notes.
- [ ] Versioning and changelog.
- [ ] Basic crash reporting toggle.

Acceptance: Installer builds and installs; app auto-updates to a test release.

### M10 — QA, Documentation, and Showcase (Day 13 – 14)
- [ ] Test matrix: 10+ scripts mix (Node, Python, PowerShell), long-running and quick-exit.
- [ ] Edge cases: failing scripts, flapping restarts, killing trees, big logs.
- [ ] User guide with screenshots/gifs.
- [ ] Resume/portfolio page section with highlights and design rationale.

Acceptance: Clean test run; documentation published; demo assets ready.

---

## Detailed Task Backlog

### Engineering
- [ ] IPC contract definition (`ipc/process:start`, `:stop`, `:status`, `:logs:subscribe`, etc.)
- [ ] Typed event bus in main process; renderer hooks for subscriptions.
- [ ] Process supervisor with per-script state machine.
- [ ] Exponential backoff utility with jitter and cancelation.
- [ ] Log writer with rotation (size/time-based) and index.
- [ ] Metrics sampler abstraction (pluggable backends).
- [ ] Safe env var handling and secrets masking in UI/logs.
- [ ] Schema migration framework and seed scripts.

### UI/UX
- [ ] Component library setup (buttons, cards, badges, switches, dialog, drawer, tabs).
- [ ] `ScriptCard` with status, actions, metrics.
- [ ] `ScriptEditorModal` with validation and test-run.
- [ ] `LogsPanel` with search, pause, follow tail.
- [ ] `ProfilesSidebar` and `ProfileSummary` header.
- [ ] `SettingsView` with sections and save/apply feedback.
- [ ] Global command palette (Ctrl+K).

### DevEx / CI
- [ ] E2E tests with Playwright (simulate starting a mock script).
- [ ] Unit tests for process manager and backoff logic.
- [ ] Linting and type checks in CI.
- [ ] Release pipeline: tag -> build -> publish artifacts.

### Security & Robustness
- [ ] Sandboxed renderer; limit IPC surface; validate inputs.
- [ ] Graceful shutdown: signal handling, timeouts, and forced kill.
- [ ] Prevent orphan processes; verify process tree termination.
- [ ] Permissions: warn when running scripts requiring elevated rights.
- [ ] Path validation to avoid injection; escaping for args.

### Observability
- [ ] Structured logging (main/renderer) with log levels.
- [ ] Optional telemetry toggle (anonymous, local-only by default).
- [ ] Crash dumps opt-in.

---

## Risks and Mitigations
- **Long-running heavy logs**: Use streaming, backpressure, and virtualization; rotate logs.
- **Zombie processes**: Always track PIDs and use tree-kill; verify children exit.
- **Flapping restarts**: Backoff with max retries; surface to user with opt-out.
- **Privileges**: Scripts needing admin may fail; detect and prompt re-launch as admin.
- **Installer/updates**: Code signing complexity; allow unsigned local builds during dev.

---

## Implementation Notes
- Favor pure TypeScript with explicit types for IPC messages.
- Decouple UI state from runtime state; reconcile via subscriptions.
- Keep process manager deterministic and testable.
- Make visuals distinctive: card glows, grid layout, console vibes.

---

## Stretch Goals (Nice-to-Have)
- Templates for common script types (Python venv, Node npm scripts, PowerShell).
- HTTP health-checks and readiness gates per script.
- Web dashboard (local LAN) mirror view.
- Import from Procfile/PM2 config.
- Timed schedules and dependencies between scripts.

---

## Kickoff Checklist
- [ ] Confirm tech stack and installer target.
- [ ] List your initial ~10 scripts with commands/env/cwd.
- [ ] Decide JSON vs SQLite for MVP storage.
- [ ] Choose accent color palette and iconography.
- [ ] Create a first profile for boot startup.


