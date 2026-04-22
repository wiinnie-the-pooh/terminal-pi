import path from 'node:path';

export interface FileLikeUri {
  scheme?: string;
  fsPath?: string;
}

export interface ExplorerSelectionEntry extends FileLikeUri {
  isDirectory?: boolean;
}

export type ResourceSelectionMode = 'skill' | 'template' | 'extension';

export function isSkillResourcePath(filePath: string): boolean {
  return path.win32.basename(filePath) === 'SKILL.md';
}

export function isTemplateResourcePath(filePath: string): boolean {
  return path.win32.extname(filePath).toLowerCase() === '.md'
    && !isSkillResourcePath(filePath);
}

export function isExtensionResourcePath(filePath: string): boolean {
  return path.win32.extname(filePath).toLowerCase() === '.ts';
}

export function getEligibleResourcePaths(
  mode: ResourceSelectionMode,
  entries: ExplorerSelectionEntry[],
): string[] | undefined {
  if (entries.length === 0) {
    return undefined;
  }

  const resourcePaths: string[] = [];

  for (const entry of entries) {
    if (entry.scheme !== 'file' || entry.isDirectory || !entry.fsPath) {
      return undefined;
    }
    if (!matchesMode(mode, entry.fsPath)) {
      return undefined;
    }
    resourcePaths.push(entry.fsPath);
  }

  return dedupePreserveOrder(resourcePaths);
}

export function getActiveEditorFilePath(
  documentUri: FileLikeUri | undefined,
): string | undefined {
  if (!documentUri || documentUri.scheme !== 'file' || !documentUri.fsPath) {
    return undefined;
  }

  return documentUri.fsPath;
}

function matchesMode(mode: ResourceSelectionMode, filePath: string): boolean {
  switch (mode) {
    case 'skill':
      return isSkillResourcePath(filePath);
    case 'template':
      return isTemplateResourcePath(filePath);
    case 'extension':
      return isExtensionResourcePath(filePath);
  }
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
