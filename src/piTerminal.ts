export const PI_TERMINAL_NAME = 'Pi Dock';
export const PI_TERMINAL_ACTIVE_CONTEXT = 'piDock.activeTerminal';

export function isPiTerminalName(name: string | undefined): boolean {
  return name === PI_TERMINAL_NAME;
}
