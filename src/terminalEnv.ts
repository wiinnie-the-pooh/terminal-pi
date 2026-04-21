export type TerminalEnvSource = Record<string, string | undefined>;

export const DEFAULT_PI_EDITOR = 'code --wait';

export function buildPiTerminalEnv(
  baseEnv: TerminalEnvSource
): Record<string, string> {
  const editor = baseEnv.VISUAL || baseEnv.EDITOR || DEFAULT_PI_EDITOR;

  return {
    EDITOR: baseEnv.EDITOR || editor,
    VISUAL: baseEnv.VISUAL || editor,
  };
}

export function getPiTerminalEnv(): Record<string, string> {
  const processEnv = (
    globalThis as typeof globalThis & {
      process?: { env?: TerminalEnvSource };
    }
  ).process?.env ?? {};

  return buildPiTerminalEnv(processEnv);
}
