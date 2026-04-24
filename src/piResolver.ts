import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface PiShell {
  /** Absolute path (or bare name) of the executable used as shellPath. */
  shellPath: string;
  /** Arguments prepended before user-supplied pi arguments. */
  prefixArgs: string[];
}

/**
 * Resolve how to launch pi as the terminal's shell process.
 *
 * Why this exists
 * ---------------
 * VS Code extensions such as ms-python inspect a terminal's shellPath to
 * decide whether to inject activation commands (e.g. `<venv>\Scripts\activate`)
 * via `terminal.sendText`.  That injection lands in pi's stdin and corrupts
 * its session.
 *
 *   - On Unix, `pi` on PATH is a Node shebang script.  Using
 *     `shellPath: 'pi'` makes the extension see an unknown shell type and
 *     skip injection.
 *   - On Windows, `pi` on PATH is `pi.cmd` (an npm-generated batch
 *     wrapper).  The extension classifies it as a cmd.exe shell and
 *     injects a Windows `activate` path.  To avoid this we bypass the
 *     wrapper and launch `node.exe` directly with pi's underlying `.js`
 *     entry point.  `node.exe` is not a recognised shell, so injection
 *     is skipped.
 *
 * On any resolution failure we fall back to `shellPath: 'pi'`, preserving
 * the previous (injection-vulnerable but functional) behaviour rather
 * than breaking terminal creation outright.
 */
/* c8 ignore start */
export function resolvePiShell(): PiShell {
  if (process.platform !== 'win32') {
    return { shellPath: 'pi', prefixArgs: [] };
  }

  try {
    const piCmd = findPiCmd();
    if (!piCmd) {
      return { shellPath: 'pi', prefixArgs: [] };
    }
    const piScript = extractPiScriptFromCmd(piCmd);
    if (!piScript) {
      return { shellPath: 'pi', prefixArgs: [] };
    }
    const nodeExe = findNodeExe(path.dirname(piCmd));
    if (!nodeExe) {
      return { shellPath: 'pi', prefixArgs: [] };
    }
    return { shellPath: nodeExe, prefixArgs: [piScript] };
  } catch {
    return { shellPath: 'pi', prefixArgs: [] };
  }
}
/* c8 ignore stop */

/* c8 ignore start */
export function resolveNodePath(): string {
  if (process.platform !== 'win32') return 'node';
  const piCmd = findPiCmd();
  if (piCmd) {
    const nodeExe = findNodeExe(path.dirname(piCmd));
    if (nodeExe) return nodeExe;
  }
  return 'node';
}
/* c8 ignore stop */

/** Locate `pi.cmd` on PATH via `where.exe`. */
/* c8 ignore start */
function findPiCmd(): string | undefined {
  try {
    const out = execFileSync('where.exe', ['pi'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.toLowerCase().endsWith('pi.cmd'));
  } catch {
    return undefined;
  }
}
/* c8 ignore stop */

/**
 * Extract the absolute path of pi's JS entry point from the npm-generated
 * `.cmd` wrapper by grepping for the last quoted `*.js` / `*.mjs` / `*.cjs`
 * literal.  The npm / pnpm / yarn templates all embed the script path as
 * a quoted string; we do not care which template generated the file.
 */
/* c8 ignore start */
function extractPiScriptFromCmd(piCmdPath: string): string | undefined {
  const contents = fs.readFileSync(piCmdPath, 'utf8');
  const resolved = parsePiScriptPath(contents, piCmdPath);
  if (!resolved) {
    return undefined;
  }
  return fs.existsSync(resolved) ? resolved : undefined;
}
/* c8 ignore stop */

/**
 * Pure helper: parse a `.cmd` wrapper's contents and return the resolved
 * absolute path of the referenced `.js` / `.mjs` / `.cjs` script, or
 * `undefined` if none is found.  Exported for unit testing.
 */
export function parsePiScriptPath(
  cmdContents: string,
  piCmdPath: string,
): string | undefined {
  const matches = [...cmdContents.matchAll(/"([^"\r\n]+\.(?:js|mjs|cjs))"/gi)];
  if (matches.length === 0) {
    return undefined;
  }
  // Take the last match -- npm's template mentions node.exe first, then the
  // script path.  Using last-match is robust to template reordering.
  const raw = matches[matches.length - 1][1];
  const expanded = expandCmdVars(raw, piCmdPath);
  // Use Windows path semantics regardless of host platform because we are
  // parsing a Windows .cmd wrapper.  This keeps tests deterministic on
  // Linux CI runners.
  return path.win32.resolve(expanded);
}

/**
 * Expand the subset of cmd.exe variables that appear in npm-generated
 * wrappers: `%~dp0` and `%dp0%` both evaluate to the directory of the
 * `.cmd` file with a trailing separator.
 */
function expandCmdVars(raw: string, piCmdPath: string): string {
  const cmdDir = path.win32.dirname(piCmdPath) + path.win32.sep;
  return raw
    .replace(/%~dp0\\?/gi, cmdDir)
    .replace(/%dp0%\\?/gi, cmdDir);
}

/**
 * Prefer a sibling `node.exe` (as used by Node installers that drop
 * node.exe next to npm's global dir), otherwise fall back to whatever
 * `where.exe node` resolves first.
 */
/* c8 ignore start */
function findNodeExe(npmDir: string): string | undefined {
  const sibling = path.join(npmDir, 'node.exe');
  if (fs.existsSync(sibling)) {
    return sibling;
  }
  try {
    const out = execFileSync('where.exe', ['node'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    const first = out.split(/\r?\n/)[0].trim();
    return first || undefined;
  } catch {
    return undefined;
  }
}
/* c8 ignore stop */
