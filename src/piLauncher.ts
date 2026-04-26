import { execFileSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'path';
import { clearInterval, setInterval } from 'timers';

export function mapFilePath(baseDir: string, guid: string): string {
  return path.join(baseDir, '.piagent', guid + '.map');
}

export function readMapFile(filePath: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    return content || undefined;
  } catch {
    return undefined;
  }
}

export function writeMapFile(filePath: string, sessionId: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, sessionId, 'utf8');
}

export function collectSessionFiles(baseDir: string): Set<string> {
  const result = new Set<string>();
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const files = fs.readdirSync(path.join(baseDir, entry.name));
        for (const f of files) {
          if (f.endsWith('.jsonl')) result.add(path.join(baseDir, entry.name, f));
        }
      /* c8 ignore start */
      } catch {
        // skip unreadable subdir
      }
      /* c8 ignore stop */
    }
  } catch {
    // baseDir missing or unreadable
  }
  return result;
}

export function extractSessionId(filename: string): string | undefined {
  const match = /^[^_]+_([0-9a-f-]+)\.jsonl$/i.exec(filename);
  return match ? match[1] : undefined;
}

export function findNewSessionId(baseDir: string, before: Set<string>): string | undefined {
  const current = collectSessionFiles(baseDir);
  const newFiles = [...current].filter((f) => !before.has(f));
  if (newFiles.length === 0) return undefined;
  const chosen =
    newFiles.length === 1
      ? newFiles[0]
      : newFiles.reduce((a, b) => {
          try {
            return fs.statSync(a).mtimeMs >= fs.statSync(b).mtimeMs ? a : b;
          /* c8 ignore start */
          } catch {
            return a;
          }
          /* c8 ignore stop */
        });
  return extractSessionId(path.basename(chosen));
}

export function hasSessionMap(baseDir: string, guid: string): boolean {
  return fs.existsSync(mapFilePath(baseDir, guid));
}

export function parsePiScriptPath(
  cmdContents: string,
  piCmdPath: string,
): string | undefined {
  const matches = [...cmdContents.matchAll(/"([^"\r\n]+\.(?:js|mjs|cjs))"/gi)];
  if (matches.length === 0) {
    return undefined;
  }
  const raw = matches[matches.length - 1][1];
  const cmdDir = path.win32.dirname(piCmdPath) + path.win32.sep;
  const expanded = raw
    .replace(/%~dp0\\?/gi, cmdDir)
    .replace(/%dp0%\\?/gi, cmdDir);
  return path.win32.resolve(expanded);
}

export function buildLaunchArgs(args: string[], piSessionId?: string): string[] {
  if (piSessionId !== undefined) {
    return ['--continue', '--session', piSessionId, ...args];
  }
  return args;
}

export interface LauncherArgs {
  guid: string | undefined;
  baseDir: string;
  argsForPi: string[];
}

/**
 * Parse the argv array passed to the piLauncher script entry point.
 *
 * --session <guid>   Pi Bay's own GUID. Consumed here; not forwarded to pi.
 * --session-dir <d>  Directory for session storage. Used as baseDir for
 *                    snapshot/poll AND forwarded to pi via argsForPi so pi
 *                    also writes sessions there.
 *
 * For either flag, if the value token is missing the flag is ignored and the
 * default is used. Only the first occurrence of each flag is honoured.
 */
export function parseLauncherArgs(argv: string[], defaultBaseDir: string): LauncherArgs {
  let guid: string | undefined;
  let baseDir: string | undefined;
  const argsForPi: string[] = [];

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--session' && guid === undefined) {
      const val = argv[i + 1];
      if (val !== undefined && !val.startsWith('-')) {
        guid = val;
        i += 2;
        continue;
      }
    } else if (arg === '--session-dir' && baseDir === undefined) {
      const val = argv[i + 1];
      if (val !== undefined && !val.startsWith('-')) {
        baseDir = val;
        // Forward both flag and value so pi also writes to this dir.
        argsForPi.push(arg, val);
        i += 2;
        continue;
      }
    } else {
      argsForPi.push(arg);
    }
    i++;
  }

  return { guid, baseDir: baseDir ?? defaultBaseDir, argsForPi };
}

/* c8 ignore start */
interface PiCommand {
  executable: string;
  prefixArgs: string[];
}

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

function resolvePiCommand(): PiCommand {
  if (process.platform !== 'win32') {
    return { executable: 'pi', prefixArgs: [] };
  }
  try {
    const piCmd = findPiCmd();
    if (!piCmd) return { executable: 'pi', prefixArgs: [] };
    const contents = fs.readFileSync(piCmd, 'utf8');
    const piScript = parsePiScriptPath(contents, piCmd);
    if (!piScript || !fs.existsSync(piScript)) return { executable: 'pi', prefixArgs: [] };
    const nodeExe = findNodeExe(path.dirname(piCmd));
    if (!nodeExe) return { executable: 'pi', prefixArgs: [] };
    return { executable: nodeExe, prefixArgs: [piScript] };
  } catch {
    return { executable: 'pi', prefixArgs: [] };
  }
}

if (require.main === module) {
  process.title = 'Pi Bay';
  const defaultBaseDir = path.join(os.homedir(), '.pi', 'agent', 'sessions');
  const { guid, baseDir, argsForPi } = parseLauncherArgs(process.argv.slice(2), defaultBaseDir);

  const isRestore = guid ? hasSessionMap(baseDir, guid) : false;
  const piSessionId = isRestore && guid ? readMapFile(mapFilePath(baseDir, guid)) : undefined;
  const finalArgs = buildLaunchArgs(argsForPi, piSessionId);

  let pollTimer: ReturnType<typeof setInterval> | undefined;

  let runPollNow: (() => void) | undefined;

  if (guid && !isRestore) {
    const snapshot = collectSessionFiles(baseDir);
    const mPath = mapFilePath(baseDir, guid);
    const poll = () => {
      const newId = findNewSessionId(baseDir, snapshot);
      if (newId) {
        try { writeMapFile(mPath, newId); } catch { /* ignore write errors */ }
        clearInterval(pollTimer);
        pollTimer = undefined;
      }
    };
    pollTimer = setInterval(poll, 5000);
    runPollNow = poll;
  }

  const { executable, prefixArgs } = resolvePiCommand();
  const child = spawn(executable, [...prefixArgs, ...finalArgs], { stdio: 'inherit' });
  // Run one poll tick immediately after spawn in case Pi creates its session file
  // very quickly (avoids the 5-second blind spot from setInterval's initial delay).
  runPollNow?.();
  child.on('exit', (code) => {
    if (pollTimer) clearInterval(pollTimer);
    process.exit(code ?? 1);
  });
  child.on('error', (err) => {
    if (pollTimer) clearInterval(pollTimer);
    console.error(err.message);
    process.exit(1);
  });
}
/* c8 ignore stop */
