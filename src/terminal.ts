import * as vscode from 'vscode';
import { PI_TERMINAL_NAME } from './piTerminal';
import { resolvePiShell } from './piResolver';
import { getPiTerminalEnv } from './terminalEnv';

export class PiTerminalManager implements vscode.Disposable {

  /**
   * Create a terminal that runs pi directly as the shell process.
   *
   * The shellPath is resolved so that extensions (e.g. ms-python) do not
   * classify the terminal as a known shell and inject activation commands
   * via sendText.  See `resolvePiShell` for the per-platform strategy.
   *
   * The pi arguments are passed as shellArgs, so pi starts with the correct
   * arguments immediately and no sendText call is needed after creation.
   */
  private createTerminal(editorCommand: string, piArgs: string[]): vscode.Terminal {
    const { shellPath, prefixArgs } = resolvePiShell();
    return vscode.window.createTerminal({
      name: PI_TERMINAL_NAME,
      shellPath,
      shellArgs: [...prefixArgs, ...piArgs],
      location: { viewColumn: vscode.ViewColumn.Beside },
      isTransient: true,
      env: getPiTerminalEnv(editorCommand),
    });
  }

  /**
   * Build the argv list passed to the pi process via shellArgs.
   *
   * @param defaultArgs  User-configured args string, split on whitespace.
   *                     Simple space-separated tokens only; quoted values
   *                     containing spaces are not supported.
   * @param extraFlags   CLI flags prepended before defaultArgs (e.g. ['-c']).
   * @param filePath     Optional @filepath context argument.
   * @param message      Optional message for print-mode (-p).
   */
  private buildArgs(
    defaultArgs: string,
    extraFlags: string[],
    filePath?: string,
    message?: string,
  ): string[] {
    const args: string[] = [...extraFlags];

    if (defaultArgs.trim()) {
      // Split tokens like '--thinking low' → ['--thinking', 'low'].
      args.push(...defaultArgs.trim().split(/\s+/));
    }

    if (filePath) {
      // pi uses @filepath syntax.  No shell quoting is needed here because the
      // value is delivered as a single argv element, not via a shell command line.
      args.push(`@${filePath}`);
    }

    if (message) {
      args.push(message);
    }

    return args;
  }

  public runInteractive(
    defaultArgs: string,
    editorCommand: string,
    filePath?: string,
  ): void {
    const terminal = this.createTerminal(
      editorCommand,
      this.buildArgs(defaultArgs, [], filePath),
    );
    terminal.show(false);
  }

  public async runPrintMode(
    defaultArgs: string,
    editorCommand: string,
    filePath?: string,
  ): Promise<void> {
    const message = await vscode.window.showInputBox({
      prompt: 'Enter message for pi (print mode)',
      placeHolder: 'e.g. Explain this code',
      ignoreFocusOut: true,
    });
    if (message === undefined) {
      return;
    }
    const terminal = this.createTerminal(
      editorCommand,
      this.buildArgs(defaultArgs, ['-p'], filePath, message),
    );
    terminal.show(false);
  }

  public runContinue(defaultArgs: string, editorCommand: string): void {
    const terminal = this.createTerminal(
      editorCommand,
      this.buildArgs(defaultArgs, ['-c']),
    );
    terminal.show(false);
  }

  public runBrowseSessions(defaultArgs: string, editorCommand: string): void {
    const terminal = this.createTerminal(
      editorCommand,
      this.buildArgs(defaultArgs, ['-r']),
    );
    terminal.show(false);
  }

  public dispose(): void {
    // No-op: terminal instances are managed by VS Code.
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
