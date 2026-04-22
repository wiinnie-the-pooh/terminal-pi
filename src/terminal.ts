import * as vscode from 'vscode';
import { getConfig } from './config';
import { PI_TERMINAL_NAME } from './piTerminal';
import { resolvePiShell } from './piResolver';
import { withActivationDisabled } from './pythonActivationGuard';
import { getPiTerminalEnv } from './terminalEnv';

export class PiTerminalManager implements vscode.Disposable {
  /**
   * Create a Pi terminal and bring it to the foreground.
   *
   * Two layers of defence against external `sendText` injection (notably
   * ms-python's venv activation):
   *
   *   1. `resolvePiShell` picks a `shellPath` that isn't a recognised
   *      shell, avoiding shell-type-based activation hooks.
   *   2. `withActivationDisabled` temporarily flips
   *      `python.terminal.activateEnvironment` to `false` around the
   *      `createTerminal` call, draining long enough for ms-python's
   *      `onDidOpenTerminal` handler to observe the override, then
   *      restores the previous value.
   *
   * Both `createTerminal` and `show` run inside the override closure so
   * the terminal appears in the UI immediately; the drain+restore runs
   * in the background from the user's perspective.
   */
  private async createAndShowTerminal(
    editorCommand: string,
    piArgs: string[],
  ): Promise<void> {
    const { shellPath, prefixArgs } = resolvePiShell();
    const { virtualEnvironmentOverride, virtualEnvironmentDrainMs } = getConfig();
    const options: vscode.TerminalOptions = {
      name: PI_TERMINAL_NAME,
      shellPath,
      shellArgs: [...prefixArgs, ...piArgs],
      location: { viewColumn: vscode.ViewColumn.Beside },
      isTransient: true,
      env: getPiTerminalEnv(editorCommand),
    };
    if (virtualEnvironmentOverride) {
      await withActivationDisabled(() => {
        const terminal = vscode.window.createTerminal(options);
        terminal.show(false);
      }, virtualEnvironmentDrainMs);
      return;
    }

    const terminal = vscode.window.createTerminal(options);
    terminal.show(false);
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

  public async runInteractive(
    defaultArgs: string,
    editorCommand: string,
    filePath?: string,
  ): Promise<void> {
    await this.createAndShowTerminal(
      editorCommand,
      this.buildArgs(defaultArgs, [], filePath),
    );
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
    await this.createAndShowTerminal(
      editorCommand,
      this.buildArgs(defaultArgs, ['-p'], filePath, message),
    );
  }

  public async runContinue(
    defaultArgs: string,
    editorCommand: string,
  ): Promise<void> {
    await this.createAndShowTerminal(
      editorCommand,
      this.buildArgs(defaultArgs, ['-c']),
    );
  }

  public async runBrowseSessions(
    defaultArgs: string,
    editorCommand: string,
  ): Promise<void> {
    await this.createAndShowTerminal(
      editorCommand,
      this.buildArgs(defaultArgs, ['-r']),
    );
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
