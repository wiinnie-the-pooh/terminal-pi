# Editor Command Auto-Detection Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Make Pi Dock choose a host-aware default `EDITOR`/`VISUAL` command for `Ctrl+G`, while preserving explicit user overrides and graceful fallbacks.

**Architecture:** Add a small resolver module that inspects VS Code product identity (`vscode.env`) and verifies candidate CLIs on PATH before exporting an editor command. Keep terminal creation thin by letting `terminalEnv.ts` consume the resolver output and return either explicit vars, inherited vars, or no override.

**Tech Stack:** TypeScript, VS Code extension API, Node.js built-ins, node:test

---

### Task 1: Add resolver tests for host detection and fallback behavior

**Files:**
- Create: `tests/editorCommandResolver.test.js`
- Modify: `tests/__fixtures__/vscode-stub.js` (only if needed for env fields)
- Test: `tests/editorCommandResolver.test.js`

**Step 1: Write the failing test**

Add tests covering:
- explicit command wins
- `uriScheme: 'vscode'` -> `code --wait`
- `uriScheme: 'vscode-insiders'` -> `code-insiders --wait`
- `uriScheme: 'cursor'` -> `cursor --wait`
- known product but CLI unavailable -> no detected command
- web host / unsupported host -> no detected command
- unknown product -> no detected command

Use dependency injection so the test can fake:
- VS Code env identity
- inherited env
- PATH command availability

**Step 2: Run test to verify it fails**

Run: `node --test tests/editorCommandResolver.test.js`
Expected: FAIL because the resolver module does not exist yet.

**Step 3: Write minimal implementation**

Create a resolver module, likely `src/editorCommandResolver.ts`, with a pure function that:
- accepts host identity and command-availability probe
- returns either a detected editor command or `undefined`

**Step 4: Run test to verify it passes**

Run: `node --test tests/editorCommandResolver.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/editorCommandResolver.test.js src/editorCommandResolver.ts
git commit -m "feat: resolve editor command from host product"
```

### Task 2: Update terminal env assembly to support explicit, inherited, and no-override outcomes

**Files:**
- Modify: `src/terminalEnv.ts`
- Modify: `tests/terminalEditor.test.js`
- Test: `tests/terminalEditor.test.js`

**Step 1: Write the failing test**

Add tests for:
- explicit configured command still sets both `EDITOR` and `VISUAL`
- empty config + detected command sets both vars
- empty config + inherited `EDITOR` only mirrors to both
- empty config + inherited `VISUAL` only mirrors to both
- empty config + no detected command + no inherited vars returns an empty env override object

**Step 2: Run test to verify it fails**

Run: `node --test tests/terminalEditor.test.js`
Expected: FAIL because current code always falls back to `code --wait`.

**Step 3: Write minimal implementation**

Refactor `terminalEnv.ts` so it:
- stops hardcoding `code --wait` as the unconditional fallback
- accepts an optional detected command
- preserves inherited env when present
- returns `{}` when no override should be applied

**Step 4: Run test to verify it passes**

Run: `node --test tests/terminalEditor.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/terminalEnv.ts tests/terminalEditor.test.js
git commit -m "refactor: support auto-detected editor env"
```

### Task 3: Wire config and terminal creation into the new resolver flow

**Files:**
- Modify: `src/config.ts`
- Modify: `src/terminal.ts`
- Modify: `tests/config.test.js`
- Test: `tests/config.test.js`

**Step 1: Write the failing test**

Add tests showing that:
- `piDock.editorCommand` defaults to an empty string instead of `code --wait`
- explicit configured values are still preserved

**Step 2: Run test to verify it fails**

Run: `node --test tests/config.test.js`
Expected: FAIL because config still defaults to `code --wait`.

**Step 3: Write minimal implementation**

Update config and terminal plumbing so:
- the setting default is empty string
- explicit values still pass through unchanged
- terminal creation asks the resolver for a detected command only when explicit config is blank

**Step 4: Run targeted tests to verify they pass**

Run: `node --test tests/config.test.js tests/editorCommandResolver.test.js tests/terminalEditor.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/config.ts src/terminal.ts tests/config.test.js package.json
git commit -m "feat: auto-detect default editor command"
```

### Task 4: Update extension metadata and docs

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Write the doc/manifest changes**

Update:
- `piDock.editorCommand` default to `""`
- setting description to explain smart auto-detection and explicit override behavior
- README feature/settings text to describe Stable/Insiders/Cursor auto-detection
- AGENTS manual checklist with rows covering Stable/Insiders/Cursor host-aware default behavior and fallback behavior when CLI is unavailable

**Step 2: Verify docs match implementation**

Run: `rg -n "code --wait|editorCommand|Cursor|Insiders" README.md AGENTS.md package.json src tests`
Expected: descriptions are consistent with the new behavior.

**Step 3: Commit**

```bash
git add package.json README.md AGENTS.md
git commit -m "docs: describe editor command auto-detection"
```

### Task 5: Full verification

**Files:**
- No new files expected

**Step 1: Run automated verification**

Run:
```bash
npm test
npm run compile
```
Expected: all tests pass, compile succeeds.

**Step 2: Record manual verification checklist**

Review the AGENTS checklist items relevant to:
- `Ctrl+G`
- explicit `piDock.editorCommand`
- Stable / Insiders / Cursor product defaults
- fallback when mapped CLI is unavailable

**Step 3: Commit final adjustments if needed**

```bash
git add -A
git commit -m "test: finalize editor command auto-detection"
```
