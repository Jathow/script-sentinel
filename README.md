# Script Sentinel

A modern, dark-themed desktop script manager built with Electron, React, TypeScript, and Tailwind.

## Tech
- Electron + Vite + TypeScript
- React 18 + Tailwind CSS
- IPC bridge via secure preload

## Develop
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run dist # Windows NSIS installer
```

## Features
- Dashboard with per-script status, CPU/RAM, uptime, health
- Start/stop/restart, Kill Tree
- Auto-restart with backoff and retries
- Live logs (tail), search, download; virtualized for performance
- Profiles: bulk start/stop, auto-start on login (Windows auto-launch)
- Notifications: native crash alerts, in-app toasts
- Tray: quick start/stop and open app
- Settings: theme, notifications, start minimized, update channel, logs path
- Import/export JSON (scripts, profiles, settings)
- Auto-update (GitHub provider)

## Usage

### Add a script (GUI)
1. Open the app → click "Add Script".
2. Fill the fields:
   - Name: friendly display name.
   - Command: executable on your PATH (e.g., `node`, `python`, `pwsh`) or an absolute path.
   - Args: space-separated arguments (parsed like a terminal).
   - Working Directory: optional folder to run the command in.
   - Environment: one `KEY=VALUE` per line.
   - Auto Start / Auto Restart: toggles.
   - Restart Policy: `Always`, `On Crash`, or `Never`.
   - Backoff (ms): base delay before a retry.
   - Max Retries: `-1` for unlimited.
   - Health Port / Health URL: optional liveness checks.
3. Click "Test Run" to validate the command quickly.
4. Click "Save".

### Examples

Python script in a project folder:

```
Name: Completed Races
Command: python
Args: zed_api.py
Working Directory: C:\Users\Justin\Programming Experiments\zedchampion
Restart Policy: On Crash
Backoff (ms): 1000
Max Retries: 5
Profiles: Justin
```

Node heartbeat (cross-platform):

```
Command: node
Args: -e "setInterval(() => console.log('beat'), 2000)"
Restart Policy: Always
Max Retries: -1
```

Add environment variables (one per line):

```
NODE_ENV=production
API_KEY=abc123
PATH=C:\\tools;${PATH}
```

Health check examples:

```
Health Port: 3000             # considers the script healthy when TCP port 3000 is listening
Health URL: http://localhost:8080/healthz   # healthy on HTTP 2xx
```

### Import a config
Use Settings → Import Config to load a set of scripts. Minimal JSON:

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

## Import a test matrix

Use Settings → Import Config to load a test set of scripts. Example JSON structure:

```json
{
  "schemaVersion": 1,
  "profiles": [{ "id": "p1", "name": "Test Matrix", "scriptIds": ["n1"] }],
  "scripts": [
    { "id": "n1", "name": "Node Heartbeat", "command": "node", "args": ["-e", "setInterval(()=>console.log('beat'),2000)"] }
  ],
  "settings": { "theme": "dark" }
}
```

## User Guide
- See `docs/USER_GUIDE.md` for detailed setup and operation instructions.

## License

This project is provided under a non-commercial license to protect it as a portfolio project. See `LICENSE` for the full terms. In short: you may use, view, and modify it for personal, educational, or internal evaluation purposes, but you may not sell, sublicense, or commercially distribute it, and attribution is required.



