import * as vscode from 'vscode';
import { getConfig, onConfigChange } from './config';
import {
  isPiTerminalName,
  PI_TERMINAL_ACTIVE_CONTEXT,
} from './piTerminal';
import { PiTerminalManager } from './terminal';

let statusBarItem: vscode.StatusBarItem | undefined;
let terminalManager: PiTerminalManager;

export function activate(context: vscode.ExtensionContext): void {
  terminalManager = new PiTerminalManager();
  context.subscriptions.push(terminalManager);

  context.subscriptions.push(
    vscode.commands.registerCommand('piCodingAgent.run', async () => {
      const cfg = getConfig();
      await terminalManager.runInteractive(cfg.defaultArgs, cfg.editorCommand);
    })
  );

  setupStatusBar(context);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTerminal(() => {
      void updateActiveTerminalContext();
    })
  );

  context.subscriptions.push(
    onConfigChange((cfg) => updateStatusBarVisibility(cfg.showStatusBar))
  );

  void updateActiveTerminalContext();
}

function setupStatusBar(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'piCodingAgent.run';
  statusBarItem.text = '$(terminal) Pi';
  statusBarItem.tooltip = 'Run Pi Coding Agent';
  statusBarItem.accessibilityInformation = {
    label: 'Pi Coding Agent',
    role: 'button',
  };
  context.subscriptions.push(statusBarItem);
  updateStatusBarVisibility(getConfig().showStatusBar);
}

function updateStatusBarVisibility(show: boolean): void {
  if (!statusBarItem) {
    return;
  }
  show ? statusBarItem.show() : statusBarItem.hide();
}

async function updateActiveTerminalContext(): Promise<void> {
  await vscode.commands.executeCommand(
    'setContext',
    PI_TERMINAL_ACTIVE_CONTEXT,
    isPiTerminalName(vscode.window.activeTerminal?.name)
  );
}

export function deactivate(): void {
  // VS Code disposes all context.subscriptions automatically.
}
