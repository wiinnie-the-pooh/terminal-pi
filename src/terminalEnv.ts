export type TerminalEnvSource = Record<string, string | undefined>;

export const DEFAULT_PI_EDITOR = 'code --wait';

export function buildPiTerminalEnv(
  baseEnv: TerminalEnvSource,
  configuredEditorCommand?: string
): Record<string, string> {
  const explicitEditor = configuredEditorCommand?.trim();
  const editor = explicitEditor || baseEnv.VISUAL || baseEnv.EDITOR || DEFAULT_PI_EDITOR;

  return {
    EDITOR: explicitEditor || baseEnv.EDITOR || editor,
    VISUAL: explicitEditor || baseEnv.VISUAL || editor,
  };
}

export function getPiTerminalEnv(configuredEditorCommand?: string): Record<string, string> {
  const processEnv = (
    globalThis as typeof globalThis & {
      process?: { env?: TerminalEnvSource };
    }
  ).process?.env ?? {};

  return buildPiTerminalEnv(processEnv, configuredEditorCommand);
}
