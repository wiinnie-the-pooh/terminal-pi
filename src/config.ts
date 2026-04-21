import * as vscode from 'vscode';

export interface PiConfig {
  defaultArgs: string;
  showStatusBar: boolean;
}

const SECTION = 'piCodingAgent';

export function getConfig(): PiConfig {
  const cfg = vscode.workspace.getConfiguration(SECTION);
  return {
    defaultArgs: cfg.get<string>('defaultArgs', ''),
    showStatusBar: cfg.get<boolean>('showStatusBar', true),
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
