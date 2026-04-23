import { execFileSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'path';

export function hasExistingSession(sessionsBaseDir: string, guid: string): boolean {
  try {
    const entries = fs.readdirSync(sessionsBaseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const files = fs.readdirSync(path.join(sessionsBaseDir, entry.name));
      if (files.some((f: string) => f.endsWith(`_${guid}.jsonl`))) return true;
    }
    return false;
  } catch {
    return false;
  }
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

export function buildLaunchArgs(args: string[], isExistingSession: boolean): string[] {
  const sIdx = args.indexOf('--session');
  if (!isExistingSession || sIdx < 0 || sIdx + 1 >= args.length) {
    return args;
  }
  return ['--continue', '--session', args[sIdx + 1]];
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
  process.title = 'Pi Dock';
  const piArgs = process.argv.slice(2);
  const sIdx = piArgs.indexOf('--session');
  const guid = sIdx >= 0 && sIdx + 1 < piArgs.length ? piArgs[sIdx + 1] : undefined;
  const baseDir = path.join(os.homedir(), '.pi', 'agent', 'sessions');
  const existing = guid ? hasExistingSession(baseDir, guid) : false;
  const finalArgs = buildLaunchArgs(piArgs, existing);

  const { executable, prefixArgs } = resolvePiCommand();
  const child = spawn(executable, [...prefixArgs, ...finalArgs], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 1));
  child.on('error', (err) => {
    console.error(err.message);
    process.exit(1);
  });
}
/* c8 ignore stop */
