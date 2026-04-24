import * as vscode from 'vscode';

const PYTHON_EXTENSION_ID = 'ms-python.python';
const CONFIG_SECTION = 'python.terminal';
const CONFIG_KEY = 'activateEnvironment';

interface RestoreState {
  target: vscode.ConfigurationTarget;
  previousValue: boolean | undefined;
}

/**
 * Run `create` with `python.terminal.activateEnvironment` briefly forced
 * to `false`, so the ms-python extension skips its `sendText`-based venv
 * activation flow in the newly created Pi terminal.
 *
 * Sequence:
 *   1. Inspect the current setting; if ms-python is absent or the value
 *      is already `false`, run `create()` unchanged.
 *   2. `await` a write of `false` at the active scope (Workspace if a
 *      folder is open, otherwise Global).  Awaiting is what guarantees
 *      ms-python's `onDidOpenTerminal` handler observes the override.
 *   3. Run `create()` — callers should construct *and show* the terminal
 *      inside this closure so the UI is responsive while the drain runs.
 *   4. Drain for `drainMs` so ms-python's async open-terminal handler has
 *      a chance to process the event.
 *   5. Restore the original value (best-effort; errors are logged).
 *
 * No state leaks between calls — each invocation inspects, flips and
 * restores independently.
 */
/* c8 ignore start */
export async function withActivationDisabled<T>(
  create: () => T,
  drainMs: number,
): Promise<T> {
  if (!isPythonExtensionPresent()) {
    return create();
  }

  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const inspected = config.inspect<boolean>(CONFIG_KEY);
  const hasWorkspace = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
  const state = decideRestoreState(inspected, hasWorkspace);

  if (state.previousValue === false) {
    // User has already disabled activation; nothing to do.
    return create();
  }

  await writeSetting(state.target, false);
  try {
    const result = create();
    if (drainMs > 0) {
      await sleep(drainMs);
    }
    return result;
  } finally {
    try {
      await writeSetting(state.target, state.previousValue);
    } catch (err) {
      console.error(
        '[pi-agent] Failed to restore python.terminal.activateEnvironment:',
        err,
      );
    }
  }
}
/* c8 ignore stop */

/**
 * Decide which configuration scope to read/write and what the previous
 * value at that scope was.  Pure helper, exported for unit testing.
 *
 * Workspace scope is preferred when a workspace folder is open so the
 * override does not leak across unrelated windows; otherwise fall back
 * to Global (user) scope.
 */
export function decideRestoreState(
  inspected:
    | {
        workspaceValue?: boolean;
        globalValue?: boolean;
      }
    | undefined,
  hasWorkspace: boolean,
): RestoreState {
  if (hasWorkspace) {
    return {
      target: vscode.ConfigurationTarget.Workspace,
      previousValue: inspected?.workspaceValue,
    };
  }
  return {
    target: vscode.ConfigurationTarget.Global,
    previousValue: inspected?.globalValue,
  };
}

/* c8 ignore start */
async function writeSetting(
  target: vscode.ConfigurationTarget,
  value: boolean | undefined,
): Promise<void> {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await config.update(CONFIG_KEY, value, target);
}
/* c8 ignore stop */

/* c8 ignore start */
function isPythonExtensionPresent(): boolean {
  return vscode.extensions.getExtension(PYTHON_EXTENSION_ID) !== undefined;
}
/* c8 ignore stop */

/* c8 ignore start */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
/* c8 ignore stop */
