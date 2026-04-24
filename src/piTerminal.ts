export const PI_TERMINAL_NAME = 'Pi Bay';
export const PI_TERMINAL_ACTIVE_CONTEXT = 'piBay.activeTerminal';

export function isPiTerminalName(name: string | undefined): boolean {
  return name === PI_TERMINAL_NAME;
}
