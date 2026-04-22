import * as vscode from 'vscode';

export interface PersistedSession {
  sessionDir: string;
  createdAt: string;
  piArgs: string[];
}

const KEY = 'piDock.sessions';

type Store = Pick<vscode.ExtensionContext, 'workspaceState'>;

export function loadSessions(store: Store): PersistedSession[] {
  try {
    return store.workspaceState.get<PersistedSession[]>(KEY) ?? [];
  } catch {
    return [];
  }
}

export async function appendSession(store: Store, s: PersistedSession): Promise<void> {
  const sessions = loadSessions(store);
  sessions.push(s);
  await store.workspaceState.update(KEY, sessions);
}

export async function removeSession(store: Store, createdAt: string): Promise<void> {
  const sessions = loadSessions(store).filter((s) => s.createdAt !== createdAt);
  await store.workspaceState.update(KEY, sessions);
}

export async function clearSessions(store: Store): Promise<void> {
  await store.workspaceState.update(KEY, []);
}
