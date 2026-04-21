export const PI_TERMINAL_NAME = 'Pi Coding Agent';
export const PI_TERMINAL_ACTIVE_CONTEXT = 'piCodingAgent.activeTerminal';

export function isPiTerminalName(name: string | undefined): boolean {
  return name === PI_TERMINAL_NAME;
}
