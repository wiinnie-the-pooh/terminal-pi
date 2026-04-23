import path from 'node:path';

export interface FileLikeUri {
  scheme?: string;
  fsPath?: string;
}

export interface ExplorerSelectionEntry extends FileLikeUri {
  isDirectory?: boolean;
}

export type ResourceSelectionMode = 'skill' | 'template' | 'extension' | 'prompt';

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.avif',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.wav', '.ogg', '.flac',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.zst',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.pyc', '.class', '.o', '.obj', '.wasm',
  '.vsix', '.node',
]);

export function isEligibleFile(filePath: string): boolean {
  const ext = path.win32.extname(filePath).toLowerCase();
  return !BINARY_EXTENSIONS.has(ext);
}

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

  // Deduplication is intentionally deferred to the normalization/arg-assembly
  // layers (normalizePickedResources and buildPiResourceArgs) so that raw
  // explorer paths are preserved until they are transformed.
  return resourcePaths;
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
    case 'prompt':
      return isEligibleFile(filePath);
  }
}


