# Propagate Alt+Up Hotkey to Pi Session Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Ensure the Alt+Up key combination is forwarded to the Pi Coding Agent session running inside a VS Code: integrated terminal, rather than being intercepted by VS Code: workbench commands. The implementation must be structured so additional pass-through keybindings can be added later with minimal effort.

**Architecture:** Add a single VS Code: keybinding contribution in `package.json` for Alt+Up that uses `workbench.action.terminal.sendSequence` to emit the standard xterm CSI escape sequence (`\u001b[1;3A`). A reusable test helper validates any keybinding against a spec, making future keys a one-line addition. Documentation explains the exact pattern for adding custom pass-through keys.

**Tech Stack:** VS Code: extension manifest (`package.json`), Node.js built-in test runner, TypeScript (no runtime source changes required).

---

### Task 1: Write the failing manifest test for terminal keybindings

**Files:**
- Test: `tests/packageManifest.test.js`

**Step 1: Write the failing test**

Add a reusable helper and an assertion helper at the bottom of `tests/packageManifest.test.js`:

```javascript
function getKeybindings(keybindings) {
  return new Map(keybindings.map((kb) => [kb.key, kb]));
}

function assertSendSequenceKeybinding(key, expectedText) {
  const kbs = getKeybindings(pkg.contributes.keybindings);
  const kb = kbs.get(key);
  assert.ok(kb, `${key} keybinding should exist`);
  assert.equal(kb.command, 'workbench.action.terminal.sendSequence');
  assert.equal(kb.when, 'terminalFocus && piDock.activeTerminal');
  assert.equal(kb.args?.text, expectedText);
}

test('package.json contributes ctrl+g sendSequence keybinding for Pi terminals', () => {
  assertSendSequenceKeybinding('ctrl+g', '\u0007');
});

test('package.json contributes alt+up sendSequence keybinding for Pi terminals', () => {
  assertSendSequenceKeybinding('alt+up', '\u001b[1;3A');
});
```

**Step 2: Run the test to verify it fails**

Run:
```bash
npm test
```

Expected output: The new `alt+up` test fails because the keybinding does not yet exist in `package.json`.

**Step 3: Commit the test**

```bash
git add tests/packageManifest.test.js
git commit -m "test: add reusable manifest tests for Pi terminal keybindings"
```

---

### Task 2: Add the Alt+Up keybinding to package.json

**Files:**
- Modify: `package.json:166-177`

**Step 1: Insert the Alt+Up keybinding alongside the existing Ctrl+G binding**

Replace the existing `keybindings` array in `package.json` with:

```json
    "keybindings": [
      {
        "command": "workbench.action.terminal.sendSequence",
        "key": "ctrl+g",
        "when": "terminalFocus && piDock.activeTerminal",
        "args": {
          "text": "\u0007"
        }
      },
      {
        "command": "workbench.action.terminal.sendSequence",
        "key": "alt+up",
        "when": "terminalFocus && piDock.activeTerminal",
        "args": {
          "text": "\u001b[1;3A"
        }
      }
    ]
```

**Step 2: Run the manifest test to verify it passes**

Run:
```bash
npm test
```

Expected: All tests pass, including the new `alt+up` assertion.

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat: propagate Alt+Up to Pi terminal via sendSequence keybinding"
```

---

### Task 3: Document manual verification and extensibility pattern

**Files:**
- Modify: `TESTING.md`

**Step 1: Append a new smoke-test row**

Add the following row to the manual smoke checklist table (after test 48):

```markdown
| 49 | Focus a Pi terminal and press `Alt+Up` | VS Code: sends the Alt+Up escape sequence (`ESC [ 1 ; 3 A`) to the terminal; Pi receives the key event instead of VS Code: intercepting it |
```

**Step 2: Add an extensibility note**

Append a short paragraph at the end of the manual smoke checklist section (after the table):

```markdown
### Adding more pass-through keybindings

If additional keys need to be forwarded to Pi, add a new entry to `package.json` under `contributes.keybindings` using `workbench.action.terminal.sendSequence`, the desired `key`, and the same `when` clause (`terminalFocus && piDock.activeTerminal`). Add a corresponding one-line test in `tests/packageManifest.test.js` using `assertSendSequenceKeybinding(key, text)`. Finally, document the new key in the smoke-checklist table above.
```

**Step 3: Run the linter**

Run:
```bash
npm run lint
```

Expected: `eslint src --ext ts` exits 0.

**Step 4: Commit**

```bash
git add TESTING.md
git commit -m "docs: add Alt+Up smoke test and keybinding extensibility notes"
```

---

### Task 4: Full verification

**Step 1: Run the complete automated test suite**

```bash
npm test
```

Expected: All tests pass.

**Step 2: Compile**

```bash
npm run compile
```

Expected: `tsc -p ./` exits with code 0 and no diagnostics.

**Step 3: Package**

```bash
npm run package
```

Expected: `vsce package` succeeds and produces `pi-dock-*.vsix`.

**Step 4: Final commit (if any uncommitted changes remain)**

```bash
git status
```

If there are any remaining changes, commit them with an appropriate message.

---

## Notes

- The escape sequence `\u001b[1;3A` is the standard xterm CSI-modified arrow-up sequence (ESC `[1;3A`), representing Alt+Up. This matches what xterm.js (VS Code:'s integrated terminal) would emit natively if VS Code: did not intercept the keystroke.
- The `when` clause `terminalFocus && piDock.activeTerminal` ensures the binding only applies inside Pi Dock terminals, leaving the default VS Code: behavior unchanged for all other terminals and editors.
- No TypeScript source changes are required because `workbench.action.terminal.sendSequence` is a built-in VS Code: command.
- To add future default keybindings, follow the three-step pattern documented in `TESTING.md`: add to `package.json`, test via `assertSendSequenceKeybinding`, and document in the smoke checklist. Only Alt+Up is enabled by default for now.
