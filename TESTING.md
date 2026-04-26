# Pi Bay VS Code Extension — Testing Guide

This document describes how to verify `pi-bay` during development and before release.

It is primarily for human testing in a live VS Code instance.

For project structure, build, packaging, and publishing workflow see `AGENTS.md`.
For intended behavior and requirements see `SPEC.md`.
For user-facing usage documentation see `README.md`.

## 1. Automated tests

Run the automated smoke tests for non-VS-Code helpers:

```sh
npm test
```

These tests do not fully cover integrated terminal behavior, VS Code UI wiring, or external extension interactions. Those require manual testing.

## 2. Install for local testing

1. Build the `.vsix`:

   ```sh
   npm run package
   ```

2. Install it:

   ```sh
   code --install-extension pi-bay-*.vsix
   ```

3. Reload VS Code (`Developer: Reload Window` from Command Palette).

## 3. Manual smoke checklist

Run through the relevant scenarios after every non-trivial change.

| # | Action | Expected result |
|---|--------|----------------|
| 1 | Open any workspace folder | `$(terminal) Pi` button visible in status bar bottom-left |
| 2 | Click status bar button | Terminal named "Pi Bay" opens; `pi` starts directly (no shell prompt before it) |
| 3 | Run the same command again (terminal still open) | A new terminal opens; the original terminal remains unchanged |
| 4 | Close one Pi terminal; run the command again | A new terminal opens |
| 5 | Set `piBay.defaultArgs` to `"--thinking low"`; run Pi Bay | Pi starts with `--thinking low` passed as arguments |
| 6 | Focus a Pi terminal and press `Ctrl+G` | VS Code sends the control sequence to the terminal; Pi opens its external-editor flow in the current editor without an editor warning |
| 7 | In VS Code Stable, leave `piBay.editorCommand` empty; run Pi and press `Ctrl+G` | Pi uses the Stable CLI default (`code --wait`) |
| 8 | In VS Code Insiders, leave `piBay.editorCommand` empty; run Pi and press `Ctrl+G` | Pi uses the Insiders CLI default (`code-insiders --wait`) |
| 9 | In Cursor, leave `piBay.editorCommand` empty; run Pi and press `Ctrl+G` | Pi uses the Cursor CLI default (`cursor --wait`) |
| 10 | In a known editor variant with its CLI missing from PATH, leave `piBay.editorCommand` empty and pre-set `VISUAL` or `EDITOR` before launching VS Code | Pi Bay preserves the inherited editor env instead of forcing a broken CLI command |
| 11 | Set `piBay.editorCommand` to `code-insiders --wait`; run Pi and press `Ctrl+G` | Pi uses the configured editor command instead of the auto-detected default |
| 12 | Open a Python project with a venv configured; open a Pi terminal | No venv activation command appears in the Pi terminal; pi starts cleanly |
| 13 | On Windows, open a Pi terminal and inspect the terminal process tree (e.g. Process Explorer) | The terminal runs `node.exe <...>\@mariozechner\pi-coding-agent\dist\cli.js`, not `cmd.exe` or `pi.cmd` |
| 14 | With ms-python installed and a workspace that has a `.venv`, open a Pi terminal | No venv activation text appears in the Pi terminal; pi starts cleanly |
| 15 | During test 14, open `settings.json` within ~150 ms of the Pi terminal appearing | `python.terminal.activateEnvironment` is briefly present as `false` at workspace scope, then disappears (or returns to its prior value) once the drain completes |
| 16 | Pre-set `python.terminal.activateEnvironment` to `false` in settings, then open a Pi terminal | Setting is untouched throughout (the guard detects activation is already disabled and skips the flip) |
| 17 | Set `piBay.virtualEnvironmentDrainMs` to `0`, open a Pi terminal | Venv activation text may reappear (expected: 0 disables the drain and races with ms-python) |
| 18 | Set `piBay.virtualEnvironmentDrainMs` to `500`, open a Pi terminal | No venv activation; the restore of `python.terminal.activateEnvironment` happens ~500 ms after the terminal appears |
| 19 | Set `piBay.virtualEnvironmentOverride` to `false`, open a Pi terminal in a Python workspace | The extension does not touch `python.terminal.activateEnvironment`; the workaround is disabled explicitly by the user |
| 20 | In Explorer, select a single `SKILL.md` file | `Run Pi with Skill...` is eligible; Pi launches with `--skill <parent-directory>` and no extra picker |
| 21 | In Explorer, select a single non-skill `.md` file | `Run Pi with Template...` is eligible; Pi launches with `--prompt-template <file>` and no extra picker |
| 22 | In Explorer, select a single `.ts` file | `Run Pi with Extension...` is eligible; Pi launches with `--extension <file>` and no extra picker |
| 23 | In Explorer, select two files of the same valid mode (`SKILL.md` + `SKILL.md`, or `.md` + `.md`, or `.ts` + `.ts`) | The matching command launches with repeated same-type flags in selection order |
| 24 | In Explorer, select a mixed set such as `SKILL.md` + `review.md` or `review.md` + `helper.ts` | The selection is ineligible as a whole; Pi Bay must not partially process only the matching subset |
| 25 | In Explorer, include any folder in the selection | The selection is ineligible; Pi Bay warns and does not launch |
| 26 | In an editor with `SKILL.md` open, run `Run Pi with Skill...` | Pi launches directly with `--skill <parent-directory>` and no picker |
| 27 | In an editor with a non-skill `.md` file open, run `Run Pi with Template...` | Pi launches directly with `--prompt-template <file>` and no picker |
| 28 | In an editor with a `.ts` file open, run `Run Pi with Extension...` | Pi launches directly with `--extension <file>` and no picker |
| 29 | In an editor, invoke a mismatched command for the current file type (for example `Run Pi with Template...` on `SKILL.md`) | Pi Bay warns and does not launch |
| 30 | Run `Pi Bay: Run Pi with Skill...` from the Command Palette | Quick Pick lists only workspace `SKILL.md` files |
| 31 | Run `Pi Bay: Run Pi with Template...` from the Command Palette | Quick Pick lists only workspace `.md` files excluding `SKILL.md` |
| 32 | Run `Pi Bay: Run Pi with Extension...` from the Command Palette | Quick Pick lists only workspace `.ts` files |
| 33 | In any Command Palette resource Quick Pick, multi-select more than one item of the same type | Pi launches with repeated same-type flags in selection order, with duplicates removed after normalization |
| 34 | In Explorer, right-click a `.md` file and select "Run Pi with Prompt..." | Pi launches with `@<filepath>` and no extra picker |
| 35 | In Explorer, right-click a `.png` file and select "Run Pi with Prompt..." | Pi Bay shows a warning and does not launch |
| 36 | In an editor with a `.ts` file open, run "Run Pi with Prompt..." from the editor right-click menu | Pi launches with `@<filepath>` |
| 37 | In an editor with a binary file open (e.g. `.png`), run "Run Pi with Prompt..." | Pi Bay shows a warning and does not launch |
| 38 | Run `Pi Bay: Run Pi with Prompt...` from the Command Palette | A native File Open dialog appears (not a Quick Pick) |
| 39 | In the File Open dialog (test 38), select a text file and confirm | Pi launches with `@<selectedFile>` |
| 40 | In the File Open dialog (test 38), cancel without selecting | Nothing happens; no terminal is created |
| 41 | Set `piBay.promptExtraContext` to `focus on errors`; run "Run Pi with Prompt..." on any text file | Pi launches with `@<filepath> focus on errors` |
| 42 | Leave `piBay.promptExtraContext` empty (default); run "Run Pi with Prompt..." | Pi launches with `@<filepath>` only -- no extra argument |
| 43 | With `piBay.restoreSessionsOnStartup` enabled (default), open a workspace, run `piBay.run`, say something to pi, then fully close VS Code | (setup step) |
| 44 | Reopen the same workspace | Pi terminal reopens automatically; pi resumes the previous session (`--continue --session <pi-uuid>` is passed via sidecar map) |
| 45 | In the restored terminal, verify pi remembers the previous conversation | pi responds with context from the session before restart |
| 46 | Close the restored Pi terminal, then close and reopen VS Code | No Pi terminal auto-opens (record was pruned on close) |
| 47 | Set `piBay.restoreSessionsOnStartup` to `false`; run Pi, close VS Code, reopen | No auto-restore; Pi does not open on startup |
| 48 | Run `piBay.runWithSkill` with a skill file; close VS Code; reopen (restore enabled) | Pi terminal reopens and resumes the session via sidecar map; skill context is part of the resumed conversation |
| 49 | Focus a Pi terminal and press `Alt+Up` | VS Code: sends the Alt+Up escape sequence (`ESC [ 1 ; 3 A`) to the terminal; Pi receives the key event instead of VS Code: intercepting it |

### Assistant-area hybrid Pi view verification

Run these checks in a live VS Code window after installing the extension from a freshly built `.vsix`.

#### Placement and default-open behavior

| # | Action | Expected result |
|---|--------|----------------|
| A1 | Open the secondary side bar / assistant area and locate Pi Bay | Pi appears there as a `Pi` webview, not as a dedicated Pi Bay Activity Bar icon/container |
| A2 | Open the `Pi` assistant-area view | The embedded terminal view appears in the secondary side bar/assistant area |
| A3 | Open the `Pi` assistant-area view from a fresh window | The editor tab does **not** open automatically |
| A4 | Run `Pi Bay: Open Pi Editor View` from the Command Palette or the `Pi` view title action | A separate `Pi Editor View` editor tab opens as an optional second viewport |
| A5 | Run `Pi Bay: Run Pi Bay` or click the status bar button | The existing integrated terminal flow is unchanged: a terminal named `Pi Bay` opens and starts `pi` |

#### Shared-session two-viewport flow

1. Open the assistant-area `Pi` view.
2. In the embedded terminal, run a command or prompt that produces several lines of output, including wrapped lines.
3. Run `Pi Bay: Open Pi Editor View`.
4. Confirm the editor view shows the same transcript as the assistant-area view.
5. Type additional input in either surface.
6. Confirm output appears in both surfaces, proving both are attached to one live Pi session.
7. Scroll the editor tab upward while leaving the assistant view at the bottom.
8. Confirm the two surfaces can keep independent scroll positions while sharing the same live transcript.

#### Narrow-visible-view-wins sizing

1. Open both the assistant-area `Pi` view and the optional `Pi Editor View`.
2. Make the assistant-area view visibly narrower than the editor tab.
3. Generate output with long lines.
4. Confirm wrapping/formatting in both views matches the narrow assistant-area width.
5. Hide or close the narrow assistant-area view while leaving the editor view visible.
6. Generate more long-line output.
7. Confirm wrapping updates to the remaining wider editor viewport.
8. Reopen the assistant-area view and make it narrow again.
9. Confirm new output returns to the narrow wrapping policy.

#### Session persistence and exit behavior

1. Open the assistant-area `Pi` view and verify Pi is running.
2. Close/hide all embedded Pi views while the process is still running.
3. Reopen the assistant-area `Pi` view.
4. Confirm the same session resumes and prior transcript is still visible.
5. Let Pi exit normally from the embedded terminal.
6. Close and reopen the embedded view.
7. Confirm the exited transcript remains visible and Pi does **not** auto-restart merely because the view reopened.

### Adding more pass-through keybindings

If additional keys need to be forwarded to Pi, add a new entry to `package.json` under `contributes.keybindings` using `workbench.action.terminal.sendSequence`, the desired `key`, and the same `when` clause (`terminalFocus && piBay.activeTerminal`). Add a corresponding one-line test in `tests/packageManifest.test.js` using `assertSendSequenceKeybinding(key, text)`. Finally, document the new key in the smoke-checklist table above.

## 4. Release-oriented verification

Before publishing:

1. Run the linter:

   ```sh
   npm run lint
   ```

2. Run automated tests with the full coverage gate:

   ```sh
   npm run coverage
   ```

2a. (Optional) Verify the diff coverage gate locally:

   ```sh
   npm run diff-coverage
   ```

2b. Confirm both gates pass before proceeding.

3. Package the extension:

   ```sh
   npm run package
   ```

4. Run the relevant manual smoke tests from Section 3.
5. Confirm the produced `.vsix` installs successfully in VS Code.
6. Only then proceed with version bumping and publish workflow from `AGENTS.md`.
