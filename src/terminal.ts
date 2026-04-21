import * as vscode from 'vscode';

const TERMINAL_NAME = 'Pi Coding Agent';

export class PiTerminalManager implements vscode.Disposable {
  private _terminal: vscode.Terminal | undefined;
  private readonly _disposables: vscode.Disposable[] = [];

  constructor() {
    this._disposables.push(
      vscode.window.onDidCloseTerminal((t) => {
        if (t === this._terminal) {
          this._terminal = undefined;
        }
      })
    );
  }

  private getOrCreateTerminal(reuse: boolean): vscode.Terminal {
    if (reuse) {
      if (this._terminal && this._terminal.exitStatus === undefined) {
        return this._terminal;
      }
      const existing = vscode.window.terminals.find(
        (t) => t.name === TERMINAL_NAME && t.exitStatus === undefined
      );
      if (existing) {
        this._terminal = existing;
        return existing;
      }
    }

    const terminal = vscode.window.createTerminal({ name: TERMINAL_NAME });
    this._terminal = terminal;
    return terminal;
  }

  private buildCommand(
    defaultArgs: string,
    extraArgs: string,
    filePath?: string,
    message?: string
  ): string {
    const parts: string[] = ['pi'];

    if (extraArgs) {
      parts.push(extraArgs);
    }
    if (defaultArgs.trim()) {
      parts.push(defaultArgs.trim());
    }
    if (filePath) {
      // pi CLI uses @filepath syntax; quote to handle paths with spaces
      parts.push(`@"${filePath}"`);
    }
    if (message) {
      parts.push(`"${message.replace(/"/g, '\\"')}"`);
    }

    return parts.join(' ');
  }

  public runInteractive(
    reuse: boolean,
    defaultArgs: string,
    filePath?: string
  ): void {
    const terminal = this.getOrCreateTerminal(reuse);
    terminal.show(false);
    terminal.sendText(this.buildCommand(defaultArgs, '', filePath), true);
  }

  public async runPrintMode(
    reuse: boolean,
    defaultArgs: string,
    filePath?: string
  ): Promise<void> {
    const message = await vscode.window.showInputBox({
      prompt: 'Enter message for pi (print mode)',
      placeHolder: 'e.g. Explain this code',
      ignoreFocusOut: true,
    });
    if (message === undefined) {
      return;
    }
    const terminal = this.getOrCreateTerminal(reuse);
    terminal.show(false);
    terminal.sendText(this.buildCommand(defaultArgs, '-p', filePath, message), true);
  }

  public runContinue(reuse: boolean, defaultArgs: string): void {
    const terminal = this.getOrCreateTerminal(reuse);
    terminal.show(false);
    terminal.sendText(this.buildCommand(defaultArgs, '-c'), true);
  }

  public runBrowseSessions(reuse: boolean, defaultArgs: string): void {
    const terminal = this.getOrCreateTerminal(reuse);
    terminal.show(false);
    terminal.sendText(this.buildCommand(defaultArgs, '-r'), true);
  }

  public dispose(): void {
    for (const d of this._disposables) {
      d.dispose();
    }
  }
}

/**
 * Resolve the most relevant file path for @filepath context.
 * Priority: active editor file → first workspace folder → undefined.
 */
export function resolveFilePath(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.uri.scheme === 'file') {
    return editor.document.uri.fsPath;
  }
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri.fsPath;
  }
  return undefined;
}
