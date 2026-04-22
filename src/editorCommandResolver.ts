import { spawnSync } from 'node:child_process';

export interface EditorCommandContext {
  configuredEditorCommand?: string;
  appHost?: string;
  uriScheme?: string;
  appName?: string;
}

export type CommandAvailabilityProbe = (command: string) => boolean;

const WAIT_FLAG = ' --wait';

export function resolveEditorCommand(
  context: EditorCommandContext,
  isCommandAvailable: CommandAvailabilityProbe = commandExistsOnPath,
): string | undefined {
  const explicitEditor = context.configuredEditorCommand?.trim();
  if (explicitEditor) {
    return explicitEditor;
  }

  if (context.appHost !== 'desktop') {
    return undefined;
  }

  const command = detectEditorCommand(context);
  if (!command || !isCommandAvailable(command)) {
    return undefined;
  }

  return `${command}${WAIT_FLAG}`;
}

export function detectEditorCommand(context: EditorCommandContext): string | undefined {
  switch (context.uriScheme) {
    case 'vscode':
      return 'code';
    case 'vscode-insiders':
      return 'code-insiders';
    case 'cursor':
      return 'cursor';
    default:
      break;
  }

  const appName = context.appName?.toLowerCase();
  if (!appName) {
    return undefined;
  }

  if (appName.includes('cursor')) {
    return 'cursor';
  }
  if (appName.includes('insiders')) {
    return 'code-insiders';
  }
  if (appName.includes('visual studio code') || appName === 'vs code') {
    return 'code';
  }

  return undefined;
}

export function commandExistsOnPath(command: string): boolean {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(locator, [command], { stdio: 'ignore' });
  return result.status === 0;
}
