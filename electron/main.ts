import { app, BrowserWindow, ipcMain, nativeTheme, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDataFile, Storage } from './storage';
import { registerIpcHandlers, createProcessManager } from './ipc';

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
  } else {
    void mainWindow.loadFile(path.join(process.resourcesPath, 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
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
    void pm.start(sid);
  }
  createWindow();

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


