import path from 'node:path';
import {
  isExtensionResourcePath,
  isSkillResourcePath,
  isTemplateResourcePath,
} from './fileSelection';

export type ResourcePickerMode = 'skill' | 'template' | 'extension';

export interface ResourceQuickPickItem {
  label: string;
  description: string;
  path: string;
}

export interface PickResourcesOptions {
  discoveredPaths: string[];
  toRelativePath: (filePath: string) => string;
  showQuickPick: (
    items: ResourceQuickPickItem[],
  ) => Promise<ResourceQuickPickItem[] | undefined>;
}

export function getResourceSearchGlobs(mode: ResourcePickerMode): string[] {
  switch (mode) {
    case 'skill':
      return ['**/SKILL.md'];
    case 'template':
      return ['**/*.md'];
    case 'extension':
      return ['**/*.ts'];
  }
}

export function filterDiscoveredResources(
  mode: ResourcePickerMode,
  discoveredPaths: string[],
): string[] {
  return dedupePreserveOrder(
    discoveredPaths.filter((filePath) => matchesMode(mode, filePath)),
  );
}

export function normalizePickedResources(
  mode: ResourcePickerMode,
  paths: string[],
): string[] {
  const normalized = paths.map((filePath) =>
    mode === 'skill' ? path.win32.dirname(filePath) : filePath,
  );

  return dedupePreserveOrder(normalized);
}

export function buildResourceQuickPickItems(
  mode: ResourcePickerMode,
  discoveredPaths: string[],
  toRelativePath: (filePath: string) => string,
): ResourceQuickPickItem[] {
  return discoveredPaths.map((filePath) => ({
    label: getResourceLabel(mode, filePath),
    description: toRelativePath(filePath),
    path: filePath,
  }));
}

export async function pickResources(
  mode: ResourcePickerMode,
  options: PickResourcesOptions,
): Promise<string[] | undefined> {
  const filteredPaths = filterDiscoveredResources(mode, options.discoveredPaths);
  if (filteredPaths.length === 0) {
    return [];
  }

  const items = buildResourceQuickPickItems(
    mode,
    filteredPaths,
    options.toRelativePath,
  );
  const pickedItems = await options.showQuickPick(items);
  if (!pickedItems) {
    return undefined;
  }

  return normalizePickedResources(
    mode,
    pickedItems.map((item) => item.path),
  );
}

function matchesMode(mode: ResourcePickerMode, filePath: string): boolean {
  switch (mode) {
    case 'skill':
      return isSkillResourcePath(filePath);
    case 'template':
      return isTemplateResourcePath(filePath);
    case 'extension':
      return isExtensionResourcePath(filePath);
  }
}

function getResourceLabel(mode: ResourcePickerMode, filePath: string): string {
  switch (mode) {
    case 'skill':
      return path.win32.basename(path.win32.dirname(filePath));
    case 'template':
      return path.win32.basename(filePath, path.win32.extname(filePath));
    case 'extension':
      return path.win32.basename(filePath);
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
