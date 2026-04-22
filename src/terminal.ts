import * as vscode from 'vscode';
import { getConfig } from './config';
import { PI_TERMINAL_NAME } from './piTerminal';
import { resolvePiShell } from './piResolver';
import { withActivationDisabled } from './pythonActivationGuard';
import { resolveEditorCommand } from './editorCommandResolver';
import { getPiTerminalEnv } from './terminalEnv';
import { buildPiResourceArgs, type PiResourceMode } from './piResourceArgs';

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
    const resolvedEditorCommand = resolveEditorCommand({
      configuredEditorCommand: editorCommand,
      appHost: vscode.env.appHost,
      uriScheme: vscode.env.uriScheme,
      appName: vscode.env.appName,
    });
    const options: vscode.TerminalOptions = {
      name: PI_TERMINAL_NAME,
      shellPath,
      shellArgs: [...prefixArgs, ...piArgs],
      location: { viewColumn: vscode.ViewColumn.Beside },
      isTransient: true,
      env: getPiTerminalEnv(editorCommand, resolvedEditorCommand),
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

  private buildArgs(defaultArgs: string): string[] {
    if (!defaultArgs.trim()) {
      return [];
    }
    return defaultArgs.trim().split(/\s+/);
  }

  public async runInteractive(
    defaultArgs: string,
    editorCommand: string,
  ): Promise<void> {
    await this.createAndShowTerminal(
      editorCommand,
      this.buildArgs(defaultArgs),
    );
  }

  public async runWithResources(
    editorCommand: string,
    defaultArgs: string,
    mode: PiResourceMode,
    resources: string[],
  ): Promise<void> {
    await this.createAndShowTerminal(
      editorCommand,
      buildPiResourceArgs({
        defaultArgs,
        mode,
        resources,
      }),
    );
  }

  public dispose(): void {
    // No-op: terminal instances are managed by VS Code.
  }
}

