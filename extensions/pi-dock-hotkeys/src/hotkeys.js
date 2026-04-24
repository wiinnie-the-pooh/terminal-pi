export const PROFILE_PIDOCK = "pidock";
export const PROFILE_ORIGINAL = "original";

export const CUSTOM_ENTRY_TYPE = "pi-dock-hotkeys.profile";

export const HOTKEY_DEFINITIONS = [
  {
    id: "app.clear",
    shortcut: "alt+c",
    original: "Ctrl+C",
    label: "Clear editor",
    implementation: "clear-editor",
  },
  {
    id: "app.exit",
    shortcut: "alt+d",
    original: "Ctrl+D",
    label: "Exit when editor is empty",
    implementation: "exit-if-empty",
  },
  {
    id: "app.thinking.cycle",
    shortcut: "alt+t",
    original: "Shift+Tab",
    label: "Cycle thinking level",
    implementation: "cycle-thinking",
  },
  {
    id: "app.model.cycleForward",
    shortcut: "alt+p",
    original: "Ctrl+P",
    label: "Cycle to next model",
    implementation: "cycle-model-forward",
  },
  {
    id: "app.model.cycleBackward",
    shortcut: "shift+alt+p",
    original: "Shift+Ctrl+P",
    label: "Cycle to previous model",
    implementation: "cycle-model-backward",
  },
  {
    id: "app.tools.expand",
    shortcut: "alt+o",
    original: "Ctrl+O",
    label: "Toggle tool output",
    implementation: "toggle-tools",
  },
  {
    id: "app.message.followUp",
    shortcut: "ctrl+shift+enter",
    original: "Alt+Enter",
    label: "Queue follow-up message",
    implementation: "queue-follow-up",
  },
];

const DEFAULT_PROFILE = PROFILE_PIDOCK;

export function restorePersistedProfile(entries) {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (
      entry?.type === "custom" &&
      entry.customType === CUSTOM_ENTRY_TYPE &&
      isSupportedProfile(entry.data?.profile)
    ) {
      return entry.data.profile;
    }
  }
  return DEFAULT_PROFILE;
}

export function isSupportedProfile(profile) {
  return profile === PROFILE_PIDOCK || profile === PROFILE_ORIGINAL;
}

export function buildProfileCommandMessage(profile) {
  const isPiDock = profile === PROFILE_PIDOCK;
  const heading = isPiDock
    ? "VS Code-friendly hotkeys enabled"
    : "Original Pi hotkeys enabled";
  const switchHint = isPiDock
    ? "Run /hotkeys-original to disable the Pi Dock shortcut layer."
    : "Run /hotkeys-pidock to enable the Pi Dock shortcut layer again.";

  const rows = HOTKEY_DEFINITIONS
    .map((entry) => `- ${toDisplayKey(entry.shortcut)} -> ${entry.label} (Pi default: ${entry.original})`)
    .join("\n");

  return `${heading}.\n${switchHint}\n\nPi Dock shortcut layer:\n${rows}`;
}

export function buildStatusText(profile) {
  return profile === PROFILE_PIDOCK ? "hotkeys: Pi Dock" : "hotkeys: original";
}

export function toDisplayKey(shortcut) {
  return shortcut
    .split("+")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("+");
}

export function getNextThinkingLevel(current) {
  const levels = ["off", "minimal", "low", "medium", "high", "xhigh"];
  const index = levels.indexOf(current);
  return levels[(index >= 0 ? index : 0) + 1 === levels.length ? 0 : (index >= 0 ? index : 0) + 1];
}
