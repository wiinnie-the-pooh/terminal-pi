import {
  buildProfileCommandMessage,
  buildStatusText,
  CUSTOM_ENTRY_TYPE,
  getNextThinkingLevel,
  HOTKEY_DEFINITIONS,
  PROFILE_ORIGINAL,
  PROFILE_PIBAY,
  restorePersistedProfile,
} from "./hotkeys.js";

const STATUS_KEY = "vs-code-hotkeys";
let activeProfile = PROFILE_PIBAY;

function isPiBayProfileActive() {
  return activeProfile === PROFILE_PIBAY;
}

function updateStatus(ctx) {
  ctx.ui.setStatus(STATUS_KEY, buildStatusText(activeProfile));
}

function persistProfile(pi, profile) {
  activeProfile = profile;
  pi.appendEntry(CUSTOM_ENTRY_TYPE, {
    profile,
    changedAt: Date.now(),
  });
}

function sameModel(a, b) {
  return !!a && !!b && a.provider === b.provider && a.id === b.id;
}

async function cycleModel(pi, ctx, direction) {
  const models = ctx.modelRegistry.getAvailable();
  if (!models.length) {
    ctx.ui.notify("No available models found.", "warning");
    return;
  }

  const currentIndex = Math.max(
    0,
    models.findIndex((model) => sameModel(model, ctx.model)),
  );
  const nextIndex = (currentIndex + direction + models.length) % models.length;
  const nextModel = models[nextIndex];
  if (!nextModel) {
    return;
  }

  const didSetModel = await pi.setModel(nextModel);
  if (!didSetModel) {
    ctx.ui.notify(`Could not switch to ${nextModel.provider}/${nextModel.id}.`, "error");
  }
}

function queueFollowUp(pi, ctx) {
  const text = ctx.ui.getEditorText().trim();
  if (!text) {
    return;
  }

  pi.sendUserMessage(text, { deliverAs: "followUp" });
  ctx.ui.setEditorText("");
}

const shortcutHandlers = {
  "clear-editor": async (_pi, ctx) => {
    ctx.ui.setEditorText("");
  },
  "cycle-thinking": async (pi, ctx) => {
    const next = getNextThinkingLevel(pi.getThinkingLevel());
    pi.setThinkingLevel(next);
    ctx.ui.notify(`Thinking level -> ${next}`, "info");
  },
  "cycle-model-forward": async (pi, ctx) => {
    await cycleModel(pi, ctx, 1);
  },
  "cycle-model-backward": async (pi, ctx) => {
    await cycleModel(pi, ctx, -1);
  },
  "toggle-tools": async (_pi, ctx) => {
    ctx.ui.setToolsExpanded(!ctx.ui.getToolsExpanded());
  },
  "queue-follow-up": async (pi, ctx) => {
    queueFollowUp(pi, ctx);
  },
};

export default function piBayHotkeysExtension(pi) {
  pi.on("session_start", async (_event, ctx) => {
    activeProfile = restorePersistedProfile(ctx.sessionManager.getBranch());
    updateStatus(ctx);
  });

  pi.registerCommand("hotkeys-vs-code", {
    description: "Enable VS Code-compatible alternate hotkeys for this session",
    handler: async (_args, ctx) => {
      persistProfile(pi, PROFILE_PIBAY);
      updateStatus(ctx);
      ctx.ui.notify(buildProfileCommandMessage(PROFILE_PIBAY), "info");
    },
  });

  pi.registerCommand("hotkeys-original", {
    description: "Disable the VS Code-compatible shortcut layer and keep Pi defaults only",
    handler: async (_args, ctx) => {
      persistProfile(pi, PROFILE_ORIGINAL);
      updateStatus(ctx);
      ctx.ui.notify(buildProfileCommandMessage(PROFILE_ORIGINAL), "info");
    },
  });

  for (const definition of HOTKEY_DEFINITIONS) {
    const handler = shortcutHandlers[definition.implementation];
    if (!handler) {
      continue;
    }

    pi.registerShortcut(definition.shortcut, {
      description: definition.label,
      handler: async (ctx) => {
        if (!isPiBayProfileActive()) {
          return;
        }
        await handler(pi, ctx);
      },
    });
  }
}
