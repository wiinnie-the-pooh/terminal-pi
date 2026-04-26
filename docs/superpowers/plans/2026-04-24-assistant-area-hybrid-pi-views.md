# Assistant-Area Hybrid Pi Views Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Convert the current embedded-terminal PR from a custom Activity Bar Pi Bay container into a hybrid design with a primary assistant/secondary-sidebar Pi terminal view plus an optional editor tab, both attached to one persistent Pi session.

**Architecture:** Keep the current shared-session foundation (`PiSession`, xterm.js webview template, optional editor tab), but move the primary view into the assistant/secondary-sidebar area and refactor session attachment state so PTY sizing is computed from all visible attached views. The integrated-terminal commands remain unchanged; the new assistant-area view is additive, not a replacement.

**Tech Stack:** VS Code WebviewViewProvider / WebviewPanel APIs, newer VS Code view-container APIs if needed for assistant/secondary-sidebar placement, node-pty 1.x, @xterm/xterm 6.x, @xterm/addon-fit 0.11.x, Node.js built-in test runner.

**Prerequisite context:** This plan assumes the current PR branch already contains the first-generation embedded terminal implementation (`PiSession`, `PiSidebarProvider`, `PiPanel`, copied xterm assets, manifest contributions, tests, generated-asset policy updates).

**Primary UX requirements:**
- Pi appears in the same general assistant area as Claude/Codex-style tools
- Pi is still a real terminal, not a Chat participant
- Optional editor tab remains available as a second viewport into the same session
- Closing all views does not stop the session
- Reopening after process exit shows the exited transcript only
- **Resize policy:** among all **visible attached** Pi views, the **narrowest dimensions win** so formatting stays identical across visible surfaces
- Existing `Run Pi Bay` integrated-terminal command stays unchanged

**Reference docs to re-read before implementation:**
- `docs/superpowers/specs/2026-04-24-embedded-terminal-views-design.md`
- `docs/superpowers/plans/2026-04-24-embedded-terminal-views.md`
- VS Code contribution points docs for `views`, `viewsContainers`, and any auxiliary/secondary-sidebar API required by the selected target engine
- VS Code chat docs only to confirm that Chat Participant API is intentionally out of scope

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `package.json` | Bump VS Code engine if needed; replace custom Pi Bay Activity Bar container with assistant-area placement; keep editor-panel command; update labels |
| Modify | `src/extension.ts` | Register primary assistant-area provider instead of custom Pi Bay container; keep integrated-terminal commands unchanged |
| Modify | `src/piSession.ts` | Replace last-writer-wins resize with visible-attachment registry and narrow-visible-view-wins sizing |
| Rename/Modify | `src/piSidebarProvider.ts` or create `src/piAssistantViewProvider.ts` | Primary webview view provider for assistant/secondary-sidebar area; reports visibility and size to `PiSession` |
| Modify | `src/piPanel.ts` | Optional editor viewport; reports visibility and size to `PiSession`; no longer primary surface |
| Modify | `src/webviewTemplate.ts` | Add view identity + visibility lifecycle messages if needed |
| Modify | `tests/piSession.test.js` | Add failing tests for attachment registry, visibility tracking, and narrow-visible-view-wins sizing |
| Modify | `tests/piSidebarProvider.test.js` or create `tests/piAssistantViewProvider.test.js` | Cover assistant-area provider registration and visibility wiring |
| Modify | `tests/piPanel.test.js` | Cover visibility-aware resize participation and second-viewport behavior |
| Modify | `tests/packageManifest.test.js` | Assert assistant-area manifest contributions and removal of custom Pi Bay Activity Bar container |
| Create | `tests/viewPlacementPolicy.test.js` | Focused tests for engine/contribution policy if manifest assertions become too crowded |
| Modify | `TESTING.md` | Update manual verification to cover assistant-area placement, optional editor view, and narrow-width formatting policy |

---

## Task 1: Lock down the target placement API and manifest shape

**Files:**
- Modify: `tests/packageManifest.test.js`
- Modify: `package.json`
- Read before editing: current VS Code docs/API notes for contributing a view to the assistant/secondary-sidebar area

- [ ] **Step 1: Write failing manifest tests for the new placement**

Add tests to `tests/packageManifest.test.js` (or create `tests/viewPlacementPolicy.test.js` if clearer) that assert all of the following:

```javascript
test('package.json does not contribute a custom piBay activity bar container', () => {
  assert.equal(pkg.contributes.viewsContainers?.activitybar?.some(v => v.id === 'piBay'), false);
});

test('package.json contributes the primary Pi view to the assistant/secondary-sidebar location', () => {
  // Replace `TARGET_CONTAINER_KEY` with the real manifest key once verified from docs.
  assert.deepEqual(pkg.contributes.views?.[TARGET_CONTAINER_KEY], [
    {
      type: 'webview',
      id: 'piBay.session',
      name: 'Pi',
    },
  ]);
});

test('package.json keeps piBay.openPanel command for the optional editor viewport', () => {
  const titles = new Map(pkg.contributes.commands.map(c => [c.command, c.title]));
  assert.equal(titles.get('piBay.openPanel'), 'Open Pi Editor View');
});
```

Also add a test for the VS Code engine floor once you know the required version:

```javascript
test('package.json requires the minimum VS Code version for assistant-area view placement', () => {
  assert.equal(pkg.engines.vscode, '^X.Y.Z');
});
```

- [ ] **Step 2: Run the manifest test file and confirm it fails**

```bash
npm run compile-only && node --test tests/packageManifest.test.js
```

Expected: failures showing the old custom `piBay` Activity Bar container and/or old command title still exist.

- [ ] **Step 3: Read the VS Code docs/source and choose the exact placement mechanism**

Make one explicit decision and record it in the code comments/commit message:
- exact contributed location or API for assistant/secondary-sidebar placement
- exact minimum VS Code version required
- whether the API is stable or still proposed (if proposed-only, stop and revisit with the user before implementing)

- [ ] **Step 4: Update `package.json` to the verified manifest shape**

Make the minimal manifest changes required by the chosen API:
- remove `contributes.viewsContainers.activitybar.piBay`
- contribute the primary webview to the verified assistant/secondary-sidebar location
- keep `piBay.openPanel`, but rename the title to make it explicitly secondary, for example:

```json
{
  "command": "piBay.openPanel",
  "title": "Open Pi Editor View",
  "category": "Pi Bay",
  "icon": "$(open-preview)"
}
```

- bump `engines.vscode` to the verified minimum
- keep integrated-terminal commands untouched

- [ ] **Step 5: Re-run the manifest tests until they pass**

```bash
npm run compile-only && node --test tests/packageManifest.test.js
```

Expected: all manifest tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json tests/packageManifest.test.js
git commit -m "feat: target assistant-area placement for the primary Pi view"
```

---

## Task 2: Refactor `PiSession` to track attachments and enforce narrow-visible-view-wins sizing

**Files:**
- Modify: `tests/piSession.test.js`
- Modify: `src/piSession.ts`

- [ ] **Step 1: Add failing tests for view attachment state and narrow-width sizing**

Extend `tests/piSession.test.js` with tests like these:

```javascript
test('PiSession ignores hidden attachments when computing PTY size', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const a = s.attachView('sidebar', () => {});
  const b = s.attachView('panel', () => {});

  a.setVisible(true);
  a.setSize(80, 24);
  b.setVisible(false);
  b.setSize(120, 40);

  assert.deepEqual(ptyStub.__calls.resize.at(-1), { cols: 80, rows: 24 });
});

test('PiSession chooses the narrowest visible width across attached views', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const a = s.attachView('assistant', () => {});
  const b = s.attachView('editor', () => {});

  a.setVisible(true);
  a.setSize(88, 30);
  b.setVisible(true);
  b.setSize(140, 50);

  assert.deepEqual(ptyStub.__calls.resize.at(-1), { cols: 88, rows: 30 });
});

test('PiSession updates PTY size when the narrowest visible view becomes hidden', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const a = s.attachView('assistant', () => {});
  const b = s.attachView('editor', () => {});

  a.setVisible(true);
  a.setSize(80, 24);
  b.setVisible(true);
  b.setSize(120, 40);
  a.setVisible(false);

  assert.deepEqual(ptyStub.__calls.resize.at(-1), { cols: 120, rows: 40 });
});

test('PiSession keeps the previous PTY size when no views are visible', () => {
  const s = new PiSession(CONFIG, ptyStub.spawn);
  const a = s.attachView('assistant', () => {});

  a.setVisible(true);
  a.setSize(90, 25);
  const before = ptyStub.__calls.resize.length;
  a.setVisible(false);

  assert.equal(ptyStub.__calls.resize.length, before);
});
```

Use the smallest possible API surface in the tests. A good target is something like:

```typescript
const view = session.attachView('assistant', sender);
view.setVisible(true);
view.setSize(80, 24);
view.dispose();
```

- [ ] **Step 2: Run the focused PiSession tests and confirm they fail**

```bash
npm run compile-only && node --test tests/piSession.test.js
```

Expected: failures because `attachView` / visibility-aware sizing do not exist yet.

- [ ] **Step 3: Implement the minimal attachment-registry API in `src/piSession.ts`**

Refactor `PiSession` so it stores attachment metadata, for example:

```typescript
interface PiViewAttachmentState {
  id: string;
  send: (msg: PiSessionMessage) => void;
  visible: boolean;
  cols?: number;
  rows?: number;
}
```

Add a method like:

```typescript
attachView(id: string, send: (msg: PiSessionMessage) => void) {
  // register sender + scrollback replay
  // return { setVisible, setSize, dispose }
}
```

Add a private recomputation helper that:
- filters to visible attachments with defined sizes
- chooses the minimum visible `cols`
- chooses the matching `rows` for the chosen narrowest view
- resizes the PTY only when the effective size changes
- does nothing when there are no visible sized attachments

Do **not** change scrollback replay or output broadcasting semantics.

- [ ] **Step 4: Re-run the focused tests until they pass**

```bash
npm run compile-only && node --test tests/piSession.test.js
```

Expected: all PiSession tests pass.

- [ ] **Step 5: Run the full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/piSession.ts tests/piSession.test.js
git commit -m "feat: make PiSession enforce narrow visible view sizing"
```

---

## Task 3: Convert the primary view provider to assistant-area semantics with visibility reporting

**Files:**
- Modify: `tests/piSidebarProvider.test.js` or create `tests/piAssistantViewProvider.test.js`
- Modify or create: `src/piSidebarProvider.ts` or `src/piAssistantViewProvider.ts`

- [ ] **Step 1: Decide whether to rename the provider file/class**

Choose one of these and stick to it consistently:
- keep `PiSidebarProvider` name even though it now lives in assistant/secondary-sidebar
- rename to `PiAssistantViewProvider`

Recommendation: rename it so the code matches the UX.

- [ ] **Step 2: Write failing tests for visibility-aware attachment wiring**

Cover at least these behaviors:

```javascript
test('provider attaches the webview to PiSession with a stable view id', () => {
  // assert session.attachView called with the expected id
});

test('provider marks the webview visible when resolved', () => {
  // assert attachment.setVisible(true)
});

test('provider forwards resize messages to attachment.setSize instead of session.resize', () => {
  // assert attachment API called
});

test('provider marks the webview hidden or detaches on dispose', () => {
  // assert attachment.dispose() or setVisible(false) + dispose()
});
```

Prefer a fake session like:

```javascript
function makeSession() {
  const calls = [];
  return {
    attachView(id, send) {
      calls.push({ type: 'attach', id, send });
      return {
        setVisible(v) { calls.push({ type: 'visible', value: v }); },
        setSize(cols, rows) { calls.push({ type: 'size', cols, rows }); },
        dispose() { calls.push({ type: 'dispose' }); },
      };
    },
    write(data) { calls.push({ type: 'write', data }); },
    __calls: calls,
  };
}
```

- [ ] **Step 3: Run the focused provider test and confirm it fails**

```bash
npm run compile-only && node --test tests/piSidebarProvider.test.js
```

Expected: failures because the provider still calls `piSession.resize(...)` directly.

- [ ] **Step 4: Implement the provider changes minimally**

In the provider:
- attach once via `piSession.attachView(...)`
- immediately set visible true when the view resolves
- on incoming `{type: 'resize'}` messages call `attachment.setSize(cols, rows)`
- keep `{type: 'input'}` forwarding to `piSession.write(...)`
- on disposal call `attachment.dispose()`

If the chosen VS Code API exposes explicit visibility-change hooks beyond dispose, wire those too and test them.

- [ ] **Step 5: Re-run the provider test until it passes**

```bash
npm run compile-only && node --test tests/piSidebarProvider.test.js
```

Expected: provider tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/piSidebarProvider.ts tests/piSidebarProvider.test.js
# or renamed files if you chose the rename
git commit -m "feat: make the primary Pi assistant view visibility-aware"
```

---

## Task 4: Update `PiPanel` to act as an optional second viewport only

**Files:**
- Modify: `tests/piPanel.test.js`
- Modify: `src/piPanel.ts`

- [ ] **Step 1: Add failing tests for visibility-aware panel attachment**

Add tests that assert:

```javascript
test('PiPanel attaches as a second view through PiSession.attachView', () => {
  // attachView called with an editor-panel id
});

test('PiPanel forwards resize to attachment.setSize', () => {
  // no direct piSession.resize call
});

test('PiPanel detaches when disposed', () => {
  // attachment.dispose called
});
```

Keep the existing singleton/reveal tests.

- [ ] **Step 2: Run the focused panel test and confirm it fails**

```bash
npm run compile-only && node --test tests/piPanel.test.js
```

Expected: failures because the current panel still talks to `piSession.resize(...)` directly.

- [ ] **Step 3: Implement the minimal `PiPanel` changes**

Change `PiPanel` so it mirrors the provider attachment flow:
- attach through `piSession.attachView('editor-panel', sender)`
- set visible true on create/reveal
- forward resize to `attachment.setSize(cols, rows)`
- dispose the attachment when the panel closes

Keep:
- singleton semantics
- same HTML template
- same input forwarding to `piSession.write(...)`

- [ ] **Step 4: Re-run the focused panel tests**

```bash
npm run compile-only && node --test tests/piPanel.test.js
```

Expected: panel tests pass.

- [ ] **Step 5: Run the full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/piPanel.ts tests/piPanel.test.js
git commit -m "feat: make Pi editor view a visibility-aware second viewport"
```

---

## Task 5: Rewire `extension.ts` so the assistant-area view is primary and the editor view is optional

**Files:**
- Modify: `src/extension.ts`
- Modify: tests that assert command registration indirectly, if needed

- [ ] **Step 1: Add/extend a failing manifest or extension registration test if one is practical**

If current tests can cheaply assert command presence/titles only, keep this task implementation-only. If a test is feasible, add one focused assertion that the optional editor-view command still exists and the integrated-terminal commands remain unchanged.

- [ ] **Step 2: Read the current `activate()` flow completely**

Before editing, re-read:
- `src/extension.ts`
- current provider/panel classes
- current `packageManifest.test.js`

- [ ] **Step 3: Replace the old primary-surface wiring with the new provider**

In `activate()`:
- keep integrated-terminal setup exactly as-is
- keep shared `PiSession` creation exactly once
- register the assistant-area provider as the primary embedded surface
- keep the optional editor-view command
- do **not** change `piBay.run`, `runWithSkill`, `runWithTemplate`, `runWithExtension`, or `runWithPrompt`

If you renamed the provider class/file, update imports accordingly.

- [ ] **Step 4: Update command wording if needed**

Make sure the optional editor-tab command title is explicit, for example:
- `Open Pi Editor View`
- not `Open Pi Bay Panel`

- [ ] **Step 5: Run compile + full tests**

```bash
npm run compile-only && npm test
```

Expected: full suite passes.

- [ ] **Step 6: Commit**

```bash
git add src/extension.ts package.json
# include any renamed provider file paths too
git commit -m "feat: make the assistant-area Pi view the primary embedded surface"
```

---

## Task 6: Manual verification docs for the new UX

**Files:**
- Modify: `TESTING.md`

- [ ] **Step 1: Add a manual verification section for assistant-area placement**

Document a checklist that verifies:
- Pi appears in the assistant/secondary-sidebar area, not in a custom Pi Bay Activity Bar container
- `Run Pi Bay` still opens the integrated terminal
- opening the primary Pi assistant-area view does **not** automatically open the editor tab

- [ ] **Step 2: Add a manual verification section for the shared-session two-viewport flow**

Document steps like:
1. open the assistant-area Pi view
2. run a command that generates several wrapped lines
3. open the editor view
4. confirm both surfaces show the same transcript
5. scroll the editor tab up while leaving the assistant view at the bottom
6. confirm both remain attached to one live session

- [ ] **Step 3: Add a manual verification section for narrow-visible-view-wins sizing**

Document steps like:
1. make the assistant view narrow
2. make the editor view wide
3. confirm formatting/wrapping matches the narrow width in both
4. hide/close the narrow assistant view
5. confirm formatting updates to the remaining visible wider view
6. reopen the assistant view and confirm the narrow formatting returns

- [ ] **Step 4: Add exit-persistence verification**

Document steps like:
1. close all Pi views while process is still running
2. reopen a view and confirm session resumes
3. let Pi exit
4. reopen and confirm exited transcript remains visible without auto-restart

- [ ] **Step 5: Commit**

```bash
git add TESTING.md
git commit -m "docs: update manual testing for assistant-area hybrid Pi views"
```

---

## Task 7: Final verification and PR cleanup

**Files:**
- No planned source edits; verification only unless something fails

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Run full automated verification**

```bash
npm run compile && npm test
```

Expected: compile succeeds, all tests pass.

- [ ] **Step 3: Verify VSIX contents still include required webview assets and node-pty binaries**

```bash
npx vsce ls 2>/dev/null | grep -E "(resources/webview/xterm|node_modules/node-pty/build/)" | head -20
```

Expected: includes
- `resources/webview/xterm.js`
- `resources/webview/xterm.css`
- `resources/webview/xterm-addon-fit.js`
- at least one `node_modules/node-pty/build/...` binary path

- [ ] **Step 4: Update the PR description if needed**

Revise the PR summary to describe the new assistant-area hybrid design instead of the old custom Pi Bay Activity Bar container.

- [ ] **Step 5: Commit only if verification required follow-up fixes**

If verification required no code changes, skip this step. If it did:

```bash
git add <fixed-files>
git commit -m "fix: address final verification issues for assistant-area Pi views"
```

---

## Self-Review Checklist

| Requirement | Covered by |
|---|---|
| Primary Pi surface lives in assistant/secondary-sidebar area | Task 1, Task 5 |
| Pi is not a Chat participant | Task 1 manifest/API choice; no `chatParticipants` contribution added |
| Optional editor tab remains | Task 4, Task 5 |
| Same session visible from two scroll positions | Existing shared session foundation + Task 4 + Task 6 |
| Closing views does not kill session | Existing session lifecycle preserved + Task 6 |
| Reopen after exit shows transcript only | Existing exit behavior preserved + Task 6 |
| Integrated-terminal commands remain unchanged | Task 5 |
| Narrow visible view wins terminal formatting | Task 2, Task 3, Task 4, Task 6 |
| Hidden retained views do not affect size | Task 2 |
| Generated webview assets still package correctly | Task 7 |
| node-pty binaries still package correctly | Task 7 |

---

Plan complete and saved to `docs/superpowers/plans/2026-04-24-assistant-area-hybrid-pi-views.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
