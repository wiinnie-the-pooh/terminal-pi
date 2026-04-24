export const PROFILE_PIBAY = "pibay";
export const PROFILE_ORIGINAL = "original";

export const CUSTOM_ENTRY_TYPE = "vs-code-hotkeys.profile";

export const HOTKEY_DEFINITIONS = [
  {
    id: "app.clear",
    shortcut: "alt+c",
    original: "Ctrl+C",
    label: "Clear editor",
    implementation: "clear-editor",
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

const DEFAULT_PROFILE = PROFILE_PIBAY;

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
  return profile === PROFILE_PIBAY || profile === PROFILE_ORIGINAL;
}

export function buildProfileCommandMessage(profile) {
  const isPiBay = profile === PROFILE_PIBAY;
  const heading = isPiBay
    ? "VS Code-friendly hotkeys enabled"
    : "Original Pi hotkeys enabled";
  const switchHint = isPiBay
    ? "Run /hotkeys-original to disable the VS Code-compatible shortcut layer."
    : "Run /hotkeys-vs-code to enable the VS Code-compatible shortcut layer again.";

  const rows = HOTKEY_DEFINITIONS
    .map((entry) => `- ${toDisplayKey(entry.shortcut)} -> ${entry.label} (Pi default: ${entry.original})`)
    .join("\n");

  return `${heading}.\n${switchHint}\n\nVS Code-compatible shortcut layer:\n${rows}`;
}

export function buildStatusText(profile) {
  return profile === PROFILE_PIBAY ? 'hotkeys: VS Code Compatible' : 'hotkeys: original';
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
