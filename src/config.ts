import * as vscode from 'vscode';

export interface PiConfig {
  defaultArgs: string;
  editorCommand: string;
  promptExtraContext: string;
  virtualEnvironmentOverride: boolean;
  virtualEnvironmentDrainMs: number;
}

const SECTION = 'piDock';

const DRAIN_DEFAULT_MS = 150;
const DRAIN_MAX_MS = 10_000;

export function getConfig(): PiConfig {
  const cfg = vscode.workspace.getConfiguration(SECTION);
  return {
    defaultArgs: cfg.get<string>('defaultArgs', ''),
    editorCommand: cfg.get<string>('editorCommand', ''),
    promptExtraContext: cfg.get<string>('promptExtraContext', ''),
    virtualEnvironmentOverride: cfg.get<boolean>('virtualEnvironmentOverride', true),
    virtualEnvironmentDrainMs: sanitizeDrainMs(
      cfg.get<number>('virtualEnvironmentDrainMs', DRAIN_DEFAULT_MS),
    ),
  };
}

export function onConfigChange(
  callback: (config: PiConfig) => void
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(SECTION)) {
      callback(getConfig());
    }
  });
}

/** Clamp user-supplied drain values to a sane range. */
function sanitizeDrainMs(raw: number): number {
  if (!Number.isFinite(raw) || raw < 0) {
    return DRAIN_DEFAULT_MS;
  }
  return Math.min(raw, DRAIN_MAX_MS);
}
