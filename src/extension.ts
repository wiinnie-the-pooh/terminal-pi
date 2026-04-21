import * as vscode from 'vscode';
import { PiTerminalManager, resolveFilePath } from './terminal';
import { getConfig, onConfigChange } from './config';

let statusBarItem: vscode.StatusBarItem | undefined;
let terminalManager: PiTerminalManager;

export function activate(context: vscode.ExtensionContext): void {
  terminalManager = new PiTerminalManager();
  context.subscriptions.push(terminalManager);

  context.subscriptions.push(
    vscode.commands.registerCommand('piCodingAgent.run', () => {
      const cfg = getConfig();
      terminalManager.runInteractive(cfg.defaultArgs);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('piCodingAgent.runWithFile', () => {
      const cfg = getConfig();
      const filePath = resolveFilePath();
      if (!filePath) {
        vscode.window.showWarningMessage(
          'Pi Coding Agent: No file or workspace folder is open. Opening pi without file context.'
        );
      }
      terminalManager.runInteractive(cfg.defaultArgs, filePath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('piCodingAgent.runPrintMode', async () => {
      const cfg = getConfig();
      const filePath = resolveFilePath();
      await terminalManager.runPrintMode(cfg.defaultArgs, filePath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('piCodingAgent.continueSession', () => {
      const cfg = getConfig();
      terminalManager.runContinue(cfg.defaultArgs);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('piCodingAgent.browseSessions', () => {
      const cfg = getConfig();
      terminalManager.runBrowseSessions(cfg.defaultArgs);
    })
  );

  setupStatusBar(context);

  context.subscriptions.push(
    onConfigChange((cfg) => updateStatusBarVisibility(cfg.showStatusBar))
  );
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

export function deactivate(): void {
  // VS Code disposes all context.subscriptions automatically.
}
