export type PiResourceMode = 'skill' | 'prompt-template' | 'extension';

export interface BuildPiResourceArgsInput {
  defaultArgs: string;
  targetFiles: string[];
  mode: PiResourceMode;
  resources: string[];
}

const MODE_FLAG: Record<PiResourceMode, string> = {
  skill: '--skill',
  'prompt-template': '--prompt-template',
  extension: '--extension',
};

export function buildPiResourceArgs(
  input: BuildPiResourceArgsInput,
): string[] {
  const args = splitArgs(input.defaultArgs);

  for (const file of input.targetFiles) {
    args.push(`@${file}`);
  }

  const flag = MODE_FLAG[input.mode];
  for (const resource of dedupePreserveOrder(input.resources)) {
    args.push(flag, resource);
  }

  return args;
}

function splitArgs(defaultArgs: string): string[] {
  if (!defaultArgs.trim()) {
    return [];
  }
  return defaultArgs.trim().split(/\s+/);
}

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }

  return result;
}
