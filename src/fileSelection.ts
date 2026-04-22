export interface FileLikeUri {
  scheme?: string;
  fsPath?: string;
}

export interface ExplorerSelectionEntry extends FileLikeUri {
  isDirectory?: boolean;
}

export interface ResolveCommandTargetFileOptions {
  activeEditorUri?: FileLikeUri;
  chooseWorkspaceFile: () => Promise<string | undefined>;
}

export function filterExplorerFileTargets(
  entries: ExplorerSelectionEntry[],
): string[] {
  return dedupePreserveOrder(
    entries
      .filter((entry) => entry.scheme === 'file' && !entry.isDirectory && !!entry.fsPath)
      .map((entry) => entry.fsPath as string),
  );
}

export function getActiveEditorFilePath(
  documentUri: FileLikeUri | undefined,
): string | undefined {
  if (!documentUri || documentUri.scheme !== 'file' || !documentUri.fsPath) {
    return undefined;
  }

  return documentUri.fsPath;
}

export async function resolveCommandTargetFile(
  options: ResolveCommandTargetFileOptions,
): Promise<string | undefined> {
  const activeFile = getActiveEditorFilePath(options.activeEditorUri);
  if (activeFile) {
    return activeFile;
  }

  return options.chooseWorkspaceFile();
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
