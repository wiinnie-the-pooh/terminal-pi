import path from 'node:path';
import * as vscode from 'vscode';
import { getConfig, type PiConfig } from './config';
import {
  filterExplorerFileTargets,
  resolveCommandTargetFile,
  type ExplorerSelectionEntry,
  type FileLikeUri,
} from './fileSelection';
import {
  isPiTerminalName,
  PI_TERMINAL_ACTIVE_CONTEXT,
} from './piTerminal';
import {
  buildResourceQuickPickItems,
  getResourceSearchGlobs,
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
    targetFiles: string[],
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
  getActiveEditorUri: () => FileLikeUri | undefined;
  chooseWorkspaceFile: () => Promise<string | undefined>;
  pickResources: (mode: ResourcePickerMode) => Promise<string[] | undefined>;
  warn: (message: string) => void;
}

export function activate(context: vscode.ExtensionContext): void {
  terminalManager = new PiTerminalManager();
  context.subscriptions.push(terminalManager);

  const runResourceAction = createResourceActionHandler({
    getConfig,
    terminalManager,
    resolveExplorerEntries: resolveExplorerEntriesFromArgs,
    getActiveEditorUri: () => vscode.window.activeTextEditor?.document.uri,
    chooseWorkspaceFile: pickWorkspaceTargetFile,
    pickResources: pickWorkspaceResources,
    warn: (message) => {
      void vscode.window.showWarningMessage(message);
    },
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('piDock.run', async () => {
      const cfg = getConfig();
      await terminalManager.runInteractive(cfg.defaultArgs, cfg.editorCommand);
    }),
    vscode.commands.registerCommand(
      'piDock.runWithSkill',
      async (resource?: vscode.Uri, resources?: vscode.Uri[]) => {
        await runResourceAction('skill', resource, resources);
      },
    ),
    vscode.commands.registerCommand(
      'piDock.runWithTemplate',
      async (resource?: vscode.Uri, resources?: vscode.Uri[]) => {
        await runResourceAction('template', resource, resources);
      },
    ),
    vscode.commands.registerCommand(
      'piDock.runWithExtension',
      async (resource?: vscode.Uri, resources?: vscode.Uri[]) => {
        await runResourceAction('extension', resource, resources);
      },
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
    const targetFiles = await resolveTargetFiles(deps, resource, resources);
    if (!targetFiles) {
      return;
    }

    const selectedResources = await deps.pickResources(mode);
    if (!selectedResources) {
      return;
    }
    if (selectedResources.length === 0) {
      deps.warn(`No Pi ${getModePlural(mode)} found in this workspace.`);
      return;
    }

    const cfg = deps.getConfig();
    await deps.terminalManager.runWithResources(
      cfg.editorCommand,
      cfg.defaultArgs,
      targetFiles,
      toPiResourceMode(mode),
      selectedResources,
    );
  };
}

async function resolveTargetFiles(
  deps: ResourceActionHandlerDeps,
  resource?: FileLikeUri,
  resources?: FileLikeUri[],
): Promise<string[] | undefined> {
  const hasInvocationSelection = Boolean(resource) || (resources?.length ?? 0) > 0;
  if (hasInvocationSelection) {
    const explorerEntries = await deps.resolveExplorerEntries(resource, resources);
    const targetFiles = filterExplorerFileTargets(explorerEntries);
    if (targetFiles.length === 0) {
      deps.warn('No files selected to run Pi on.');
      return undefined;
    }
    return targetFiles;
  }

  const targetFile = await resolveCommandTargetFile({
    activeEditorUri: deps.getActiveEditorUri(),
    chooseWorkspaceFile: deps.chooseWorkspaceFile,
  });
  if (!targetFile) {
    return undefined;
  }

  return [targetFile];
}

function setupStatusBar(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'piDock.run';
  statusBarItem.text = '$(terminal) Pi';
  statusBarItem.tooltip = 'Run Pi Dock';
  statusBarItem.accessibilityInformation = {
    label: 'Pi Dock',
    role: 'button',
  };
  context.subscriptions.push(statusBarItem);
  statusBarItem.show();
}

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

async function pickWorkspaceTargetFile(): Promise<string | undefined> {
  const uris = await vscode.workspace.findFiles('**/*');
  if (uris.length === 0) {
    void vscode.window.showWarningMessage('No workspace files found.');
    return undefined;
  }

  const items = uris.map((uri) => ({
    label: path.basename(uri.fsPath),
    description: vscode.workspace.asRelativePath(uri, false),
    path: uri.fsPath,
  }));
  const picked = await vscode.window.showQuickPick(items, {
    title: 'Choose file for Pi',
    matchOnDescription: true,
  });

  return picked?.path;
}

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

function filePathToRelativePath(filePath: string): string {
  return vscode.workspace.asRelativePath(vscode.Uri.file(filePath), false);
}

function getModeLabel(mode: ResourcePickerMode): string {
  switch (mode) {
    case 'skill':
      return 'Skill';
    case 'template':
      return 'Template';
    case 'extension':
      return 'Extension';
  }
}

function getModePlural(mode: ResourcePickerMode): string {
  switch (mode) {
    case 'skill':
      return 'skills';
    case 'template':
      return 'templates';
    case 'extension':
      return 'extensions';
  }
}

function toPiResourceMode(mode: ResourcePickerMode): PiResourceMode {
  switch (mode) {
    case 'skill':
      return 'skill';
    case 'template':
      return 'prompt-template';
    case 'extension':
      return 'extension';
  }
}

async function updateActiveTerminalContext(): Promise<void> {
  await vscode.commands.executeCommand(
    'setContext',
    PI_TERMINAL_ACTIVE_CONTEXT,
    isPiTerminalName(vscode.window.activeTerminal?.name)
  );
}

export function deactivate(): void {
  // VS Code disposes all context.subscriptions automatically.
}
