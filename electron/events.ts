import { BrowserWindow } from 'electron';
import type { RuntimeStateSnapshot } from '../src/shared/types';

type UpdatesEvent = {
  type: 'available' | 'none' | 'progress' | 'downloaded' | 'error';
  info?: unknown;
  message?: string;
};

export type MainEventMap = {
  'process:status:event': RuntimeStateSnapshot;
  'process:log:event': { scriptId: string; text: string };
  'process:restart:event': { scriptId: string; attempt: number };
  'updates:event': UpdatesEvent;
  'security:permission:warn': { scriptId: string; name: string; reason: string };
};

export class TypedEventBus {
  send<K extends keyof MainEventMap>(channel: K, payload: MainEventMap[K]): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(channel as string, payload as unknown);
    }
  }
}

export const eventBus = new TypedEventBus();


