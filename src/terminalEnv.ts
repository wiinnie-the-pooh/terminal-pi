export type TerminalEnvSource = Record<string, string | undefined>;

export function buildPiTerminalEnv(
  baseEnv: TerminalEnvSource,
  configuredEditorCommand?: string,
  detectedEditorCommand?: string,
): Record<string, string> {
  const explicitEditor = configuredEditorCommand?.trim();
  const editor = explicitEditor || detectedEditorCommand || baseEnv.VISUAL || baseEnv.EDITOR;

  if (!editor) {
    return {};
  }

  return {
    EDITOR: explicitEditor || detectedEditorCommand || baseEnv.EDITOR || editor,
    VISUAL: explicitEditor || detectedEditorCommand || baseEnv.VISUAL || editor,
  };
}

/* c8 ignore start */
export function getPiTerminalEnv(
  configuredEditorCommand?: string,
  detectedEditorCommand?: string,
): Record<string, string> {
  const processEnv = (
    globalThis as typeof globalThis & {
      process?: { env?: TerminalEnvSource };
    }
  ).process?.env ?? {};

  return buildPiTerminalEnv(processEnv, configuredEditorCommand, detectedEditorCommand);
}
/* c8 ignore stop */
