# Pi Resource Actions Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Add Skill, Template, and Extension Pi launchers that work from Explorer, Editor / Current File, and direct commands, with popup-only selection and correct Pi CLI argument mapping.

**Architecture:** Introduce small helper modules for deterministic Pi argument assembly, target-file resolution, and resource discovery/picking. Keep `src/extension.ts` focused on wiring commands to shared handlers, and keep `src/terminal.ts` focused on terminal creation plus launching Pi with already-normalized arguments.

**Tech Stack:** TypeScript, VS Code extension API, Node.js built-ins, node:test

---

### Task 1: Add a pure Pi resource argument builder

**Files:**
- Create: `src/piResourceArgs.ts`
- Create: `tests/piResourceArgs.test.js`
- Test: `tests/piResourceArgs.test.js`

**Step 1: Write the failing test**

Create `tests/piResourceArgs.test.js` with cases for:
- default args split first
- target files emitted as `@<absolute-path>`
- repeated `--skill` flags from normalized skill directories
- repeated `--prompt-template` flags from selected template files
- repeated `--extension` flags from selected extension files
- duplicate resource paths removed while preserving first-seen order

Example expectations:

```js
assert.deepEqual(
  buildPiResourceArgs({
    defaultArgs: '--thinking low',
    targetFiles: ['C:\\repo\\a.ts', 'C:\\repo\\b.ts'],
    mode: 'skill',
    resources: ['C:\\repo\\.pi\\skills\\review', 'C:\\repo\\.pi\\skills\\review'],
  }),
  [
    '--thinking', 'low',
    '@C:\\repo\\a.ts',
    '@C:\\repo\\b.ts',
    '--skill', 'C:\\repo\\.pi\\skills\\review',
  ]
);
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm run compile && node --test tests/piResourceArgs.test.js
```
Expected: FAIL because `src/piResourceArgs.ts` / `out/piResourceArgs.js` does not exist yet.

**Step 3: Write minimal implementation**

Create `src/piResourceArgs.ts` with:
- a `PiResourceMode` union: `'skill' | 'prompt-template' | 'extension'`
- a `buildPiResourceArgs()` function
- a small mode-to-flag map
- resource deduplication that preserves order

Keep it pure and free of VS Code dependencies.

**Step 4: Run test to verify it passes**

Run:
```bash
npm run compile && node --test tests/piResourceArgs.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/piResourceArgs.ts tests/piResourceArgs.test.js
git commit -m "feat: build pi resource launch args"
```

### Task 2: Add target-file resolution helpers for Explorer, Editor, and direct commands

**Files:**
- Create: `src/fileSelection.ts`
- Create: `tests/fileSelection.test.js`
- Test: `tests/fileSelection.test.js`

**Step 1: Write the failing test**

Create `tests/fileSelection.test.js` with cases for:
- Explorer selections ignore folders and keep file paths only
- duplicate target files are removed while preserving order
- editor resolution returns the active file path when the URI is file-backed
- direct command fallback chooses the active editor file when present
- direct command fallback requests a workspace file pick when there is no active file
- direct command resolution returns `undefined` when the user cancels the workspace file picker

Use dependency injection for anything VS Code-specific so the test can fake:
- explorer entry types (`file` vs `directory`)
- active editor URI
- workspace file choices
- Quick Pick selection result

**Step 2: Run test to verify it fails**

Run:
```bash
npm run compile && node --test tests/fileSelection.test.js
```
Expected: FAIL because `src/fileSelection.ts` does not exist yet.

**Step 3: Write minimal implementation**

Create `src/fileSelection.ts` with small helpers such as:
- `filterExplorerFileTargets(entries)`
- `getActiveEditorFilePath(documentUri)`
- `resolveCommandTargetFile(options)`

Make the direct-command fallback use a workspace-file chooser callback rather than hard-coding UI inside the pure logic.

**Step 4: Run test to verify it passes**

Run:
```bash
npm run compile && node --test tests/fileSelection.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/fileSelection.ts tests/fileSelection.test.js
git commit -m "feat: resolve target files for pi resource actions"
```

### Task 3: Add resource discovery and picker normalization for Skill, Template, and Extension flows

**Files:**
- Create: `src/resourcePicker.ts`
- Create: `tests/resourcePicker.test.js`
- Test: `tests/resourcePicker.test.js`

**Step 1: Write the failing test**

Create `tests/resourcePicker.test.js` with cases for:
- Skill picker consumes discovered `SKILL.md` files but returns parent directories
- Template picker returns selected `.md` files unchanged
- Extension picker returns selected `.ts` files unchanged
- multi-select duplicates are deduped after normalization
- picker item labels include readable names plus relative-path details
- no discovered resources returns an empty result without attempting launch
- cancelling the Quick Pick returns `undefined`

Use dependency injection so the test can fake:
- discovered workspace files
- Quick Pick selections
- workspace-relative path rendering

Example skill normalization assertion:

```js
assert.deepEqual(
  normalizePickedResources('skill', [
    'C:\\repo\\.pi\\skills\\review\\SKILL.md',
    'C:\\repo\\.pi\\skills\\review\\SKILL.md',
  ]),
  ['C:\\repo\\.pi\\skills\\review']
);
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm run compile && node --test tests/resourcePicker.test.js
```
Expected: FAIL because `src/resourcePicker.ts` does not exist yet.

**Step 3: Write minimal implementation**

Create `src/resourcePicker.ts` with:
- discovery helpers per mode
- a pure `normalizePickedResources(mode, paths)` helper
- a `pickResources(mode, deps)` function that builds multi-select Quick Pick items and returns normalized resource paths

Use these discovery rules:
- skill mode: selectable `SKILL.md` files, converted to parent directories
- template mode: selectable `.md` files
- extension mode: selectable `.ts` files

Use the display label `Template` in all user-facing text.

**Step 4: Run test to verify it passes**

Run:
```bash
npm run compile && node --test tests/resourcePicker.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/resourcePicker.ts tests/resourcePicker.test.js
git commit -m "feat: add pi resource picker flows"
```

### Task 4: Wire terminal launching to the new resource argument builder

**Files:**
- Modify: `src/terminal.ts`
- Test: `tests/piResourceArgs.test.js`

**Step 1: Write the failing integration-oriented assertion**

Extend `tests/piResourceArgs.test.js` if needed so it also covers the exact argument list expected by the terminal layer, including default args first, `@file` targets next, and resource flags last.

**Step 2: Run test to verify it fails**

Run:
```bash
npm run compile && node --test tests/piResourceArgs.test.js
```
Expected: FAIL because `src/terminal.ts` still only exposes the interactive default-args flow.

**Step 3: Write minimal implementation**

Modify `src/terminal.ts` to:
- import `buildPiResourceArgs`
- add a public method such as `runWithResources(editorCommand, defaultArgs, targetFiles, mode, resources)`
- pass the built args into the existing `createAndShowTerminal()` path

Do not duplicate shell resolution, env handling, or Python activation guard logic.

**Step 4: Run targeted tests to verify it passes**

Run:
```bash
npm run compile && node --test tests/piResourceArgs.test.js tests/terminalEditor.test.js tests/config.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/terminal.ts src/piResourceArgs.ts tests/piResourceArgs.test.js
git commit -m "feat: launch pi with selected resources"
```

### Task 5: Add extension command handlers and shared action flow

**Files:**
- Modify: `src/extension.ts`
- Create: `tests/extensionResourceActions.test.js`
- Create or modify: `tests/__fixtures__/vscode-extension-stub.js`
- Test: `tests/extensionResourceActions.test.js`

**Step 1: Write the failing test**

Create `tests/extensionResourceActions.test.js` covering:
- `Pi Dock: Run Pi with Skill...` resolves target files and opens the Skill picker
- `Pi Dock: Run Pi with Template...` resolves target files and opens the Template picker
- `Pi Dock: Run Pi with Extension...` resolves target files and opens the Extension picker
- Explorer invocations ignore folders before launching
- direct command invocation uses the active editor file when available
- direct command invocation falls back to workspace-file Quick Pick when there is no active editor file
- cancellation at either the target-file or resource-pick step does not call the terminal manager

Refactor `src/extension.ts` as needed so tests can inject:
- a fake terminal manager
- fake file-selection helpers
- fake resource-picker helpers

**Step 2: Run test to verify it fails**

Run:
```bash
npm run compile && node --test tests/extensionResourceActions.test.js
```
Expected: FAIL because the new command handlers and shared flow do not exist yet.

**Step 3: Write minimal implementation**

Modify `src/extension.ts` to:
- register three new commands
- route Explorer, Editor, and direct-command invocations through shared handlers
- resolve target files via `src/fileSelection.ts`
- resolve resources via `src/resourcePicker.ts`
- call `terminalManager.runWithResources(...)` only when both target files and resources are present

Keep the existing `piDock.run` status-bar command untouched.

**Step 4: Run test to verify it passes**

Run:
```bash
npm run compile && node --test tests/extensionResourceActions.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/extension.ts tests/extensionResourceActions.test.js tests/__fixtures__/vscode-extension-stub.js
git commit -m "feat: add pi resource action commands"
```

### Task 6: Add manifest contributions for commands and context menus

**Files:**
- Modify: `package.json`
- Create: `tests/packageManifest.test.js`
- Test: `tests/packageManifest.test.js`

**Step 1: Write the failing test**

Create `tests/packageManifest.test.js` asserting that `package.json` contributes:
- commands:
  - `piDock.runWithSkill`
  - `piDock.runWithTemplate`
  - `piDock.runWithExtension`
- Explorer context-menu items for all three
- editor context-menu items for all three
- display labels using `Template`, not `Prompt Template`

**Step 2: Run test to verify it fails**

Run:
```bash
node --test tests/packageManifest.test.js
```
Expected: FAIL because the manifest only contributes `piDock.run` today.

**Step 3: Write minimal implementation**

Modify `package.json` to add:
- three command contributions
- Explorer menu contributions
- editor menu contributions
- any needed `when` clauses so the items appear only in sensible file contexts

Do not remove the existing `piDock.run` command or status-bar entry.

**Step 4: Run test to verify it passes**

Run:
```bash
node --test tests/packageManifest.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add package.json tests/packageManifest.test.js
git commit -m "feat: contribute pi resource actions to menus"
```

### Task 7: Update README and AGENTS manual checklist

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Write the doc changes**

Update `README.md` to describe:
- the three new commands using `Template` in user-facing labels
- Explorer and Editor context-menu actions
- direct command fallback behavior when no active editor file exists
- same-type multi-select behavior
- Skill `SKILL.md` selection mapping to `--skill <parent-directory>`

Update `AGENTS.md` manual checklist with rows covering:
- Explorer: Skill / Template / Extension actions
- Editor: Skill / Template / Extension actions
- Explorer mixed file/folder selection ignores folders
- direct command invocation with active editor file
- direct command invocation without active editor file falls back to a workspace file Quick Pick
- multi-select pickers produce repeated same-type flags

**Step 2: Verify docs match implementation**

Run:
```bash
rg -n "Prompt Template|Run Pi with Template|runWithTemplate|SKILL.md|--prompt-template|--extension|--skill" README.md AGENTS.md package.json src tests
```
Expected: user-facing labels say `Template`, and the technical CLI flags remain correct.

**Step 3: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: describe pi resource actions"
```

### Task 8: Full verification

**Files:**
- No new files expected

**Step 1: Run automated verification**

Run:
```bash
npm test
npm run compile
```
Expected: all tests pass and TypeScript compiles cleanly.

**Step 2: Run manual verification**

In a live VS Code instance, verify the AGENTS checklist items for:
- Explorer Skill / Template / Extension actions
- Editor Skill / Template / Extension actions
- mixed file/folder Explorer selections
- direct command fallback to workspace file Quick Pick
- multi-select repeated flags
- terminal launch behavior remaining unchanged otherwise

**Step 3: Commit final adjustments if needed**

```bash
git add -A
git commit -m "test: finalize pi resource actions"
```
