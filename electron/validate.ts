import type { AppSettings, ScriptDefinition, Profile } from '../src/shared/types';
import { Storage } from './storage';

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

export function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') throw new Error(`Invalid ${name}: expected string`);
}

export function assertStringArray(value: unknown, name: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new Error(`Invalid ${name}: expected string[]`);
  }
}

export function assertRecordStringString(value: unknown, name: string): asserts value is Record<string, string> {
  if (!isPlainObject(value) || Object.values(value).some((v) => typeof v !== 'string')) {
    throw new Error(`Invalid ${name}: expected Record<string, string>`);
  }
}

export function assertScriptExists(id: unknown): ScriptDefinition {
  assertString(id, 'script id');
  const script = Storage.listScripts().find((s) => s.id === id);
  if (!script) throw new Error('Script not found');
  return script;
}

export function assertProfileExists(id: unknown): Profile {
  assertString(id, 'profile id');
  const profile = Storage.listProfiles().find((p) => p.id === id);
  if (!profile) throw new Error('Profile not found');
  return profile;
}

export function sanitizeSettingsPatch(patch: unknown): Partial<AppSettings> {
  if (!isPlainObject(patch)) throw new Error('Invalid settings patch');
  const out: Partial<AppSettings> = {};
  if (typeof patch.theme === 'string' && (patch.theme === 'dark' || patch.theme === 'system')) out.theme = patch.theme;
  if (typeof patch.startMinimized === 'boolean') out.startMinimized = patch.startMinimized;
  if (typeof patch.notificationsNativeEnabled === 'boolean') out.notificationsNativeEnabled = patch.notificationsNativeEnabled;
  if (typeof patch.notificationsToastEnabled === 'boolean') out.notificationsToastEnabled = patch.notificationsToastEnabled;
  if (typeof patch.updateChannel === 'string' && (patch.updateChannel === 'stable' || patch.updateChannel === 'beta')) out.updateChannel = patch.updateChannel;
  if (typeof patch.logsPath === 'string') out.logsPath = patch.logsPath;
  if (typeof patch.crashReportingEnabled === 'boolean') out.crashReportingEnabled = patch.crashReportingEnabled;
  return out;
}

function containsUnsafeShellChars(s: string): boolean {
  // Disallow characters often used for shell metacharacters even though we use shell:false
  // This is a defense-in-depth validation against accidental injection when commands are copied from shells
  return /[\n\r\0<>|;&`]/.test(s);
}

export function assertSafeCommand(command: unknown): asserts command is string {
  assertString(command, 'command');
  if (containsUnsafeShellChars(command)) throw new Error('Command contains unsafe characters');
}

export function assertSafeArgs(args: unknown): asserts args is string[] | undefined {
  if (args === undefined) return;
  assertStringArray(args, 'args');
  for (const a of args) {
    if (containsUnsafeShellChars(a)) throw new Error('Argument contains unsafe characters');
  }
}

export function assertSafeCwd(cwd: unknown): asserts cwd is string | undefined {
  if (cwd === undefined) return;
  assertString(cwd, 'cwd');
  if (/\0|\r|\n/.test(cwd)) throw new Error('cwd contains unsafe characters');
}


