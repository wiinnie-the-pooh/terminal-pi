import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getConfig } from './config';
import { PI_TERMINAL_NAME, isPiTerminalName } from './piTerminal';
import { resolvePiShell } from './piResolver';
import { withActivationDisabled } from './pythonActivationGuard';
import { resolveEditorCommand } from './editorCommandResolver';
import { getPiTerminalEnv } from './terminalEnv';
import { buildPiResourceArgs, type PiResourceMode } from './piResourceArgs';
import {
  appendSession,
  clearSessions,
  loadSessions,
  removeSession,
} from './sessionStore';

export class PiTerminalManager implements vscode.Disposable {
  private terminalCreatedAt = new WeakMap<vscode.Terminal, string>();

  /* c8 ignore start */
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
  constructor(private readonly context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.window.onDidCloseTerminal((closed) => {
        const createdAt = this.terminalCreatedAt.get(closed);
        if (createdAt && isPiTerminalName(closed.name)) {
          void removeSession(this.context, createdAt);
        }
      }),
    );
  }
  /* c8 ignore stop */

  /* c8 ignore start */
  private generateSessionDir(): string {
    return path.join(os.homedir(), '.pi', 'agent', 'sessions', 'vscode', crypto.randomUUID());
  }
  /* c8 ignore stop */

  /* c8 ignore start */
  private async createAndShowTerminal(
    editorCommand: string,
    piArgs: string[],
    sessionDir?: string,
  ): Promise<void> {
    const dir = sessionDir ?? this.generateSessionDir();
    fs.mkdirSync(dir, { recursive: true });

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
      shellArgs: [...prefixArgs, '--session-dir', dir, ...piArgs],
      location: { viewColumn: vscode.ViewColumn.Beside },
      isTransient: true,
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

    const now = new Date().toISOString();
    this.terminalCreatedAt.set(terminal, now);
    void appendSession(this.context, { sessionDir: dir, createdAt: now, piArgs });
  }
  /* c8 ignore stop */

  private buildArgs(defaultArgs: string): string[] {
    if (!defaultArgs.trim()) {
      return [];
    }
    return defaultArgs.trim().split(/\s+/);
  }

  public async restoreSessions(defaultArgs: string, editorCommand: string): Promise<void> {
    const sessions = loadSessions(this.context);
    await clearSessions(this.context);
    for (const session of sessions) {
      if (!fs.existsSync(session.sessionDir)) continue;
      // Prepend --continue so pi resumes the session in this dir.
      // Re-apply current defaultArgs in case config changed since last launch.
      const piArgs = ['--continue', ...this.buildArgs(defaultArgs), ...(session.piArgs ?? [])];
      await this.createAndShowTerminal(editorCommand, piArgs, session.sessionDir);
    }
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
      buildPiResourceArgs({
        defaultArgs,
        mode,
        resources,
      }),
    );
  }

  /* c8 ignore start */
  public dispose(): void {
    // No-op: terminal instances are managed by VS Code.
  }
  /* c8 ignore stop */
}
