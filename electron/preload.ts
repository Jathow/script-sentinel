import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('process:ping') as Promise<string>,
});

declare global {
  interface Window {
    api: {
      ping: () => Promise<string>;
    };
  }
}


