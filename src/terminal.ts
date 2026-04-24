import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getConfig } from './config';
import { PI_TERMINAL_NAME } from './piTerminal';
import { resolveNodePath } from './piResolver';
import { withActivationDisabled } from './pythonActivationGuard';
import { resolveEditorCommand } from './editorCommandResolver';
import { getPiTerminalEnv } from './terminalEnv';
import { buildPiResourceArgs, type PiResourceMode } from './piResourceArgs';

export class PiTerminalManager implements vscode.Disposable {
  /* c8 ignore start */
  /**
   * Create a Pi terminal and bring it to the foreground.
   *
   * Two layers of defence against external `sendText` injection (notably
   * ms-python's venv activation):
   *
   *   1. The launcher uses `node` as shellPath, which isn't a recognised
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
  constructor(private readonly context: vscode.ExtensionContext) {}
  /* c8 ignore stop */

  /* c8 ignore start */
  private generateSessionId(): string {
    return crypto.randomUUID();
  }
  /* c8 ignore stop */

  /* c8 ignore start */
  private async createAndShowTerminal(
    editorCommand: string,
    piArgs: string[],
  ): Promise<void> {
    const sessionId = this.generateSessionId();

    const nodePath = resolveNodePath();
    const launcherPath = path.join(this.context.extensionPath, 'out', 'piLauncher.js');
    const { virtualEnvironmentOverride, virtualEnvironmentDrainMs } = getConfig();
    const resolvedEditorCommand = resolveEditorCommand({
      configuredEditorCommand: editorCommand,
      appHost: vscode.env.appHost,
      uriScheme: vscode.env.uriScheme,
      appName: vscode.env.appName,
    });
    const options: vscode.TerminalOptions = {
      name: PI_TERMINAL_NAME,
      shellPath: nodePath,
      shellArgs: [launcherPath, '--session', sessionId, ...piArgs],
      location: { viewColumn: vscode.ViewColumn.Active },
      iconPath: {
        light: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'icons', 'pi-light.svg'),
        dark: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'icons', 'pi-dark.svg'),
      },
      env: getPiTerminalEnv(editorCommand, resolvedEditorCommand),
    };

    let terminal!: vscode.Terminal;
    if (virtualEnvironmentOverride) {
      await withActivationDisabled(() => {
        terminal = vscode.window.createTerminal(options);
        terminal.show(false);
      }, virtualEnvironmentDrainMs);
    } else {
      terminal = vscode.window.createTerminal(options);
      terminal.show(false);
    }
  }
  /* c8 ignore stop */

  private buildArgs(defaultArgs: string): string[] {
    const args = defaultArgs.trim()
      ? defaultArgs.trim().split(/\s+/)
      : [];

    args.push(
      '--extension',
      path.join(this.context.extensionPath, 'extensions', 'pi-agent-hotkeys', 'vs-code-hotkeys.js'),
    );

    return args;
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

  public async runWithPrompt(
    editorCommand: string,
    defaultArgs: string,
    filePath: string,
    extraContext: string,
  ): Promise<void> {
    const args = this.buildArgs(defaultArgs);
    args.push(`@${filePath}`);
    if (extraContext.trim()) {
      args.push(extraContext.trim());
    }
    await this.createAndShowTerminal(editorCommand, args);
  }

  public async runWithResources(
    editorCommand: string,
    defaultArgs: string,
    mode: PiResourceMode,
    resources: string[],
  ): Promise<void> {
    await this.createAndShowTerminal(
      editorCommand,
      this.buildArgs('')
        .concat(buildPiResourceArgs({
          defaultArgs,
          mode,
          resources,
        })),
    );
  }

  /* c8 ignore start */
  public dispose(): void {
    // No-op: terminal instances are managed by VS Code.
  }
  /* c8 ignore stop */
}
