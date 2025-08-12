# QA Scenarios — Edge Cases

This guide details how to validate edge cases: failing scripts, flapping restarts, killing trees, and big logs.

## Import the edge-case scripts
- Open Settings → Import Config → select `scripts/edge-cases.json`
- Select profile "Edge Cases" from the sidebar or filter by profile

## Scenarios

### 1) Failing script (crash fast)
- Start "Crash Fast" and observe:
  - Status changes to crashed
  - Native notification / toast (if enabled)
  - Auto-restart only if enabled on the script

### 2) Flapping restarts
- Start "Flap Crash" and observe:
  - Alternating exits (random failure) trigger backoff and retry
  - Retries counter increases; next restart delay visible
  - Stops after max retries

### 3) Kill process tree
- Start "Spawns Child" and then click Kill on the card
  - Confirm both parent and spawned child are terminated
  - Status becomes stopped

### 4) Big logs
- Start "Big Logs" and open Logs
  - Verify smooth scrolling due to virtualization
  - Use search to filter lines
  - Try Download to save logs

### 5) Health checks
- Start "Port 3000 Health" when port 3000 is closed
  - Healthy flag remains false
- Start a local server on port 3000 and observe healthy becomes true

## Notes
- If using PowerShell on Windows, ensure `pwsh` is in PATH or adjust command to `powershell`.
- Some scenarios may require running the app as Administrator depending on your environment.
