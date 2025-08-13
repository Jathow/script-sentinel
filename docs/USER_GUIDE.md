# Script Sentinel — User Guide

This guide covers installation, usage, shortcuts, notifications/tray, settings, import/export, health checks, troubleshooting, auto-update, and QA.

## Install and Run
- Development: `npm install` → `npm run dev`
- Production build: `npm run build`
- Windows installer: `npm run dist` (NSIS installer)

## Basics
- Add scripts with command/args/cwd/env and restart/health options
- Start/stop from cards; open Logs for live tail/search/download (virtualized)
- Create profiles and bulk start/stop; enable auto-start on login (Windows)

## Shortcuts
- Ctrl/Cmd+K: Focus search
- Ctrl/Cmd+Enter: Start selected
- Ctrl+Shift+S: Stop all
- Ctrl/Cmd+A: Select filtered

## Notifications and Tray
- Native crash notifications (optional) with click-to-restart
- In-app toasts (optional)
- Tray menu: quick Start/Stop and Open app

## Settings
- Theme (Dark/System), Notifications (native/toasts)
- Start minimized, Update channel (Stable/Beta)
- Logs path (custom directory)
- Import/Export JSON for scripts/profiles/settings

## Import/Export
- Import: Settings → Import Config → choose JSON
- Export: Settings → Export Config → downloads JSON backup

Minimal example JSON:
```json
{
  "schemaVersion": 1,
  "profiles": [{ "id": "p1", "name": "Test", "scriptIds": ["s1"] }],
  "scripts": [
    { "id": "s1", "name": "Node Heartbeat", "command": "node", "args": ["-e", "setInterval(()=>console.log('beat'),2000)"] }
  ],
  "settings": { "theme": "dark" }
}
```

## Health Checks
- Port: Healthy if a TCP port (e.g., 3000) is open
- URL: Healthy if HTTP(S) endpoint responds 2xx

## Script Settings Reference

The script editor corresponds to the following shape (subset of `src/shared/types.ts`):

```ts
interface ScriptDefinition {
  name: string;
  command: string;      // e.g., node, python, pwsh, or absolute path
  args?: string[];      // space-separated in the UI; stored as an array
  cwd?: string;         // working directory
  env?: Record<string, string>; // one KEY=VALUE per line in the UI
  autoStart?: boolean;
  autoRestart?: boolean;
  restartPolicy?: 'always' | 'on-crash' | 'never';
  backoffMs?: number;   // base backoff delay in ms
  maxRetries?: number;  // -1 for unlimited
  healthCheck?: { port?: number; url?: string };
  profiles?: string[];  // associated profile ids
}
```

### Field guidance
- **Command**: must be resolvable on PATH or an absolute path. Use `node`, `python`, `pwsh`, etc.
- **Args**: space separated. Quoting works like your shell. Example: `-e "setInterval(()=>console.log('beat'),2000)"`.
- **Environment**: one per line, e.g. `API_KEY=abc123`. Lines without `=` are ignored.
- **Backoff/Max Retries**: controls restart behavior when policy is `always` or `on-crash`. Use `-1` for unlimited retries.
- **Health checks**: either TCP `port` or HTTP(S) `url` marks the script healthy when available.

### Worked examples

Python worker with a virtualenv and env vars:

```
Name: Price Worker
Command: C:\\Users\\me\\venvs\\proj\\Scripts\\python.exe
Args: worker.py --queue prices
Working Directory: C:\\Users\\me\\proj
Environment:
  API_URL=https://api.example.com
  TOKEN=dev-secret
Restart Policy: On Crash
Backoff (ms): 2000
Max Retries: -1
Health URL: http://localhost:8080/healthz
```

Node service with port health:

```
Name: Web
Command: node
Args: server.js
Working Directory: C:\\Users\\me\\web
Restart Policy: Always
Backoff (ms): 1000
Max Retries: -1
Health Port: 3000
```

## Troubleshooting
- Ensure commands (`node`/`python`/`pwsh`) are in PATH or use full paths
- Use Kill to terminate process tree for stubborn processes
- Run as Administrator for scripts requiring elevation

## Auto-Update (Windows)
- Settings: Check for updates → Download update → Restart and install
- Requires GitHub releases on the configured repo

## QA Scenarios (Edge Cases)
- Import `scripts/edge-cases.json` (provided) for flapping/failing/child/big-logs/health tests
- Validate: retries, backoff, Kill tree behavior, log virtualization and search
