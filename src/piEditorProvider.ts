import * as vscode from 'vscode';
import type { PiSession } from './piSession';
import { generateNonce, getWebviewTemplate } from './webviewTemplate';

export class PiEditorProvider implements vscode.CustomReadonlyEditorProvider {
  static readonly viewType = 'piBay.editorPanel';
  static readonly sessionUri = vscode.Uri.parse('pi-bay:/session.pi-session');

  private static nextId = 0;
  private readonly panels = new Set<vscode.WebviewPanel>();

  constructor(
    private readonly getSession: () => PiSession,
    private readonly extensionUri: vscode.Uri,
  ) {}

  openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose() {} };
  }

  resolveCustomEditor(
    _document: vscode.CustomDocument,
    panel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): void {
    const piSession = this.getSession();
    const webview = panel.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview'),
      ],
    };

    webview.html = getWebviewTemplate({
      cspSource: webview.cspSource,
      nonce: generateNonce(),
      xtermJsUri: webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'xterm.js'),
      ).toString(),
      xtermCssUri: webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'xterm.css'),
      ).toString(),
      xtermAddonFitUri: webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'resources', 'webview', 'xterm-addon-fit.js'),
      ).toString(),
    });

    const attachment = piSession.attachView(
      `editor-panel-${PiEditorProvider.nextId++}`,
      (msg) => void webview.postMessage(msg),
    );
    attachment.setVisible(panel.visible);

    panel.onDidChangeViewState(() => {
      attachment.setVisible(panel.visible);
    });

    webview.onDidReceiveMessage((msg: { type: string; data?: string; cols?: number; rows?: number }) => {
      if (msg.type === 'input' && msg.data !== undefined) {
        piSession.write(msg.data);
      } else if (msg.type === 'resize' && msg.cols !== undefined && msg.rows !== undefined) {
        attachment.setSize(msg.cols, msg.rows);
      }
    });

    this.panels.add(panel);

    panel.onDidDispose(() => {
      attachment.dispose();
      this.panels.delete(panel);
    });
  }

  revealOrOpen(): void {
    const first = this.panels.values().next().value;
    if (first) {
      first.reveal();
      return;
    }

    void vscode.commands.executeCommand(
      'vscode.openWith',
      PiEditorProvider.sessionUri,
      PiEditorProvider.viewType,
    );
  }
}
