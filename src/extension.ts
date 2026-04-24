import * as vscode from 'vscode';
import { getConfig, type PiConfig } from './config';
import {
  getEligibleResourcePaths,
  isEligibleFile,
  type ExplorerSelectionEntry,
  type FileLikeUri,
} from './fileSelection';
import {
  isPiTerminalName,
  PI_TERMINAL_ACTIVE_CONTEXT,
} from './piTerminal';
import {
  getResourceSearchGlobs,
  normalizePickedResources,
  pickResources,
  type ResourcePickerMode,
  type ResourceQuickPickItem,
} from './resourcePicker';
import { PiTerminalManager } from './terminal';
import type { PiResourceMode } from './piResourceArgs';

let statusBarItem: vscode.StatusBarItem | undefined;
let terminalManager: PiTerminalManager;

interface ResourceTerminalManager {
  runWithResources(
    editorCommand: string,
    defaultArgs: string,
    mode: PiResourceMode,
    resources: string[],
  ): Promise<void>;
}

interface ResourceActionHandlerDeps {
  getConfig: () => PiConfig;
  terminalManager: ResourceTerminalManager;
  resolveExplorerEntries: (
    resource?: FileLikeUri,
    resources?: FileLikeUri[],
  ) => Promise<ExplorerSelectionEntry[]>;
  pickResources: (mode: ResourcePickerMode) => Promise<string[] | undefined>;
  warn: (message: string) => void;
}

/* c8 ignore start */
export function activate(context: vscode.ExtensionContext): void {
  terminalManager = new PiTerminalManager(context);
  context.subscriptions.push(terminalManager);

  const runResourceAction = createResourceActionHandler({
    getConfig,
    terminalManager,
    resolveExplorerEntries: resolveExplorerEntriesFromArgs,
    pickResources: pickWorkspaceResources,
    warn: (message) => {
      void vscode.window.showWarningMessage(message);
    },
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('piBay.run', () =>
      runCommand('run', async () => {
        const cfg = getConfig();
        await terminalManager.runInteractive(cfg.defaultArgs, cfg.editorCommand);
      })
    ),
    vscode.commands.registerCommand(
      'piBay.runWithSkill',
      (resource?: vscode.Uri, resources?: vscode.Uri[]) =>
        runCommand('runWithSkill', async () => {
          await runResourceAction('skill', resource, resources);
        }),
    ),
    vscode.commands.registerCommand(
      'piBay.runWithTemplate',
      (resource?: vscode.Uri, resources?: vscode.Uri[]) =>
        runCommand('runWithTemplate', async () => {
          await runResourceAction('template', resource, resources);
        }),
    ),
    vscode.commands.registerCommand(
      'piBay.runWithExtension',
      (resource?: vscode.Uri, resources?: vscode.Uri[]) =>
        runCommand('runWithExtension', async () => {
          await runResourceAction('extension', resource, resources);
        }),
    ),
    vscode.commands.registerCommand(
      'piBay.runWithPrompt',
      (resource?: vscode.Uri) =>
        runCommand('runWithPrompt', async () => {
          const cfg = getConfig();
          const filePath = await resolvePromptFilePath(resource);
          if (!filePath) {
            return;
          }
          await terminalManager.runWithPrompt(
            cfg.editorCommand,
            cfg.defaultArgs,
            filePath,
            cfg.promptExtraContext,
          );
        }),
    ),
  );

  setupStatusBar(context);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTerminal(() => {
      void updateActiveTerminalContext();
    })
  );

  void updateActiveTerminalContext();
}
/* c8 ignore stop */

export function createResourceActionHandler(
  deps: ResourceActionHandlerDeps,
): (
  mode: ResourcePickerMode,
  resource?: FileLikeUri,
  resources?: FileLikeUri[],
) => Promise<void> {
  return async (
    mode: ResourcePickerMode,
    resource?: FileLikeUri,
    resources?: FileLikeUri[],
  ): Promise<void> => {
    const selectedResources = await resolveResourcesForInvocation(
      deps,
      mode,
      resource,
      resources,
    );
    if (!selectedResources) {
      return;
    }

    const cfg = deps.getConfig();
    try {
      await deps.terminalManager.runWithResources(
        cfg.editorCommand,
        cfg.defaultArgs,
        toPiResourceMode(mode),
        selectedResources,
      );
    } catch (err) {
      console.error('Pi Bay: runWithResources failed:', err);
      void vscode.window.showErrorMessage(`Pi Bay failed to start: ${String(err)}`);
    }
  };
}

async function resolveResourcesForInvocation(
  deps: ResourceActionHandlerDeps,
  mode: ResourcePickerMode,
  resource?: FileLikeUri,
  resources?: FileLikeUri[],
): Promise<string[] | undefined> {
  const hasInvocationSelection = Boolean(resource) || (resources?.length ?? 0) > 0;
  if (hasInvocationSelection) {
    const explorerEntries = await deps.resolveExplorerEntries(resource, resources);
    const selectedPaths = getEligibleResourcePaths(mode, explorerEntries);
    if (!selectedPaths) {
      deps.warn(`The current selection does not match the ${getModeLabel(mode)} command.`);
      return undefined;
    }
    return normalizePickedResources(mode, selectedPaths);
  }

  const selectedResources = await deps.pickResources(mode);
  if (!selectedResources) {
    return undefined;
  }
  if (selectedResources.length === 0) {
    deps.warn(`No Pi ${getModePlural(mode)} found in this workspace.`);
    return undefined;
  }
  return selectedResources;
}

/* c8 ignore start */
function setupStatusBar(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'piBay.run';
  statusBarItem.text = '$(terminal) Pi';
  statusBarItem.tooltip = 'Run Pi Bay';
  statusBarItem.accessibilityInformation = {
    label: 'Pi Bay',
    role: 'button',
  };
  context.subscriptions.push(statusBarItem);
  statusBarItem.show();
}
/* c8 ignore stop */

/* c8 ignore start */
async function resolveExplorerEntriesFromArgs(
  resource?: FileLikeUri,
  resources?: FileLikeUri[],
): Promise<ExplorerSelectionEntry[]> {
  const uris = resources && resources.length > 0
    ? resources
    : resource
      ? [resource]
      : [];

  return Promise.all(
    uris.map(async (uri) => ({
      scheme: uri.scheme,
      fsPath: uri.fsPath,
      isDirectory: await isDirectoryUri(uri),
    })),
  );
}
/* c8 ignore stop */

/* c8 ignore start */
async function isDirectoryUri(uri: FileLikeUri): Promise<boolean> {
  if (!uri || uri.scheme !== 'file' || !uri.fsPath) {
    return false;
  }

  try {
    const stat = await vscode.workspace.fs.stat(vscode.Uri.file(uri.fsPath));
    return (stat.type & vscode.FileType.Directory) !== 0;
  } catch {
    return false;
  }
}
/* c8 ignore stop */

/* c8 ignore start */
async function pickWorkspaceResources(
  mode: ResourcePickerMode,
): Promise<string[] | undefined> {
  const discoveredPaths = await discoverWorkspaceResources(mode);
  return pickResources(mode, {
    discoveredPaths,
    toRelativePath: (filePath) => filePathToRelativePath(filePath),
    showQuickPick: async (items) => showResourceQuickPick(mode, items),
  });
}

async function discoverWorkspaceResources(
  mode: ResourcePickerMode,
): Promise<string[]> {
  const seen = new Set<string>();
  const discoveredPaths: string[] = [];

  for (const glob of getResourceSearchGlobs(mode)) {
    const uris = await vscode.workspace.findFiles(glob);
    for (const uri of uris) {
      if (seen.has(uri.fsPath)) {
        continue;
      }
      seen.add(uri.fsPath);
      discoveredPaths.push(uri.fsPath);
    }
  }

  return discoveredPaths.sort((left, right) => left.localeCompare(right));
}
/* c8 ignore stop */

/* c8 ignore start */
async function showResourceQuickPick(
  mode: ResourcePickerMode,
  items: ResourceQuickPickItem[],
): Promise<ResourceQuickPickItem[] | undefined> {
  const picked = await vscode.window.showQuickPick(items, {
    title: `Run Pi with ${getModeLabel(mode)}...`,
    placeHolder: `Select one or more ${getModePlural(mode)}`,
    canPickMany: true,
    matchOnDescription: true,
  });

  if (!picked) {
    return undefined;
  }

  return Array.from(picked);
}
/* c8 ignore stop */

/* c8 ignore start */
function filePathToRelativePath(filePath: string): string {
  return vscode.workspace.asRelativePath(vscode.Uri.file(filePath), false);
}
/* c8 ignore stop */

export function getModeLabel(mode: ResourcePickerMode): string {
  switch (mode) {
    case 'skill':
      return 'Skill';
    case 'template':
      return 'Template';
    case 'extension':
      return 'Extension';
  }
}

export function getModePlural(mode: ResourcePickerMode): string {
  switch (mode) {
    case 'skill':
      return 'skills';
    case 'template':
      return 'templates';
    case 'extension':
      return 'extensions';
  }
}

export function toPiResourceMode(mode: ResourcePickerMode): PiResourceMode {
  switch (mode) {
    case 'skill':
      return 'skill';
    case 'template':
      return 'prompt-template';
    case 'extension':
      return 'extension';
  }
}

/* c8 ignore start */
async function updateActiveTerminalContext(): Promise<void> {
  await vscode.commands.executeCommand(
    'setContext',
    PI_TERMINAL_ACTIVE_CONTEXT,
    isPiTerminalName(vscode.window.activeTerminal?.name)
  );
}
/* c8 ignore stop */

/* c8 ignore start */
async function resolvePromptFilePath(
  resource: vscode.Uri | undefined,
): Promise<string | undefined> {
  if (resource) {
    const filePath = resource.scheme === 'file' ? resource.fsPath : undefined;
    if (!filePath || !isEligibleFile(filePath)) {
      void vscode.window.showWarningMessage(
        'Run Pi with Prompt... requires a non-binary text file.',
      );
      return undefined;
    }
    return filePath;
  }

  const uris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    canSelectFiles: true,
    canSelectFolders: false,
    openLabel: 'Select Prompt File',
  });
  if (!uris || uris.length === 0) {
    return undefined;
  }
  const filePath = uris[0].fsPath;
  if (!isEligibleFile(filePath)) {
    void vscode.window.showWarningMessage(
      'Run Pi with Prompt... requires a non-binary text file.',
    );
    return undefined;
  }
  return filePath;
}
/* c8 ignore stop */

export async function runCommand(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`Pi Bay: ${label} command failed:`, err);
    void vscode.window.showErrorMessage(`Pi Bay failed to start: ${String(err)}`);
  }
}

/* c8 ignore start */
export function deactivate(): void {
  // VS Code disposes all context.subscriptions automatically.
}
/* c8 ignore stop */
