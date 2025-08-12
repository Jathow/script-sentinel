import { app, BrowserWindow, ipcMain, nativeTheme, Tray, Menu, nativeImage } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDataFile, Storage } from './storage';
import { registerIpcHandlers, createProcessManager } from './ipc';
import { logger } from './appLogger';
import { writeCrashDump } from './crash';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let rebuildTrayTimer: NodeJS.Timeout | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0b0f14',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    logger.info('Loaded dev URL', { url: devUrl });
  } else {
    // In production, our renderer is built into the dist/ directory
    const prodIndex = path.join(process.resourcesPath, 'dist', 'index.html');
    void mainWindow.loadFile(prodIndex);
    logger.info('Loaded production renderer', { file: prodIndex });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  logger.info('App ready');
  ensureDataFile();
  registerIpcHandlers();
  const pm = createProcessManager();
  // Auto-start profiles marked to launch on login
  const autostartProfiles = Storage.listProfiles().filter((p) => p.autoStartOnLogin);
  const uniqueScriptIds = Array.from(
    new Set(autostartProfiles.flatMap((p) => p.scriptIds)),
  );
  // Enable app auto-launch on Windows if any profile is set to auto-start
  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: autostartProfiles.length > 0,
      openAsHidden: true,
    });
  }
  for (const sid of uniqueScriptIds) {
    logger.info('Auto-starting script', { scriptId: sid });
    void pm.start(sid);
  }
  createWindow();
  const s = Storage.getSettings();
  if (s.startMinimized && mainWindow) {
    mainWindow.minimize();
    mainWindow.hide();
  }

  // Setup system tray with quick start/stop
  const emptyPng = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAHElEQVQoU2NkwA7+//8/DAwMZGBgGAWjYBiGgQAA2mJb3HqZl7kAAAAASUVORK5CYII='
  );
  tray = new Tray(emptyPng);
  tray.setToolTip('Script Sentinel');

  const buildTrayMenu = () => {
    const scripts = Storage.listScripts();
    const snaps = pm.listSnapshots();
    const idToStatus = new Map(snaps.map((s) => [s.scriptId, s.status]));
    const scriptItems = scripts.slice(0, 10).map((s) => {
      const status = idToStatus.get(s.id) ?? 'stopped';
      const isRunning = status === 'running' || status === 'starting' || status === 'restarting';
      return {
        label: `${isRunning ? '■ Stop' : '▶ Start'}  ${s.name}`,
        click: () => (isRunning ? pm.stop(s.id) : pm.start(s.id)),
      } as const;
    });
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open Script Sentinel', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { type: 'separator' },
      { label: 'Scripts', enabled: false },
      ...scriptItems,
      { type: 'separator' },
      { label: 'Stop All', click: () => { for (const s of scripts) void pm.stop(s.id); } },
      { label: 'Quit', role: 'quit' },
    ]);
    tray?.setContextMenu(contextMenu);
  };

  buildTrayMenu();
  if (rebuildTrayTimer) clearInterval(rebuildTrayTimer);
  rebuildTrayTimer = setInterval(buildTrayMenu, 3000);

  // Configure auto-updater (GitHub provider from package.json publish)
  autoUpdater.autoDownload = false;
  // Basic crash reporting toggle could be wired to Sentry or similar; here we log unhandled errors
  if (Storage.getSettings().crashReportingEnabled) {
    process.on('uncaughtException', (err) => {
      writeCrashDump('uncaughtException', err);
    });
    process.on('unhandledRejection', (reason) => {
      writeCrashDump('unhandledRejection', reason);
    });
  }
  autoUpdater.on('update-available', () => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('updates:event', { type: 'available' });
    }
  });
  autoUpdater.on('update-not-available', () => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('updates:event', { type: 'none' });
    }
  });
  autoUpdater.on('download-progress', (info) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('updates:event', { type: 'progress', info });
    }
  });
  autoUpdater.on('update-downloaded', () => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('updates:event', { type: 'downloaded' });
    }
  });
  autoUpdater.on('error', (err) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('updates:event', { type: 'error', message: err.message });
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('process:ping', async () => {
  return 'pong';
});

ipcMain.handle('updates:check', async () => {
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
});
ipcMain.handle('updates:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
});
ipcMain.handle('updates:quitAndInstall', async () => {
  autoUpdater.quitAndInstall();
});


