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



