import * as vscode from 'vscode';
import type { PiSession, PiViewAttachment } from './piSession';
import { generateNonce, getWebviewTemplate } from './webviewTemplate';

export class PiPanel {
  private static instance: PiPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly attachment: PiViewAttachment;

  static createOrReveal(getSession: () => PiSession, extensionUri: vscode.Uri): void {
    if (PiPanel.instance) {
      PiPanel.instance.panel.reveal();
      PiPanel.instance.attachment.setVisible(true);
      return;
    }
    PiPanel.instance = new PiPanel(getSession(), extensionUri);
  }

  private constructor(piSession: PiSession, extensionUri: vscode.Uri) {
    this.panel = vscode.window.createWebviewPanel(
      'piBay.panel',
      'Pi Editor View',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'resources', 'webview'),
        ],
      },
    );

    const webview = this.panel.webview;

    webview.html = getWebviewTemplate({
      cspSource: webview.cspSource,
      nonce: generateNonce(),
      xtermJsUri: webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'xterm.js'),
      ).toString(),
      xtermCssUri: webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'xterm.css'),
      ).toString(),
      xtermAddonFitUri: webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'resources', 'webview', 'xterm-addon-fit.js'),
      ).toString(),
    });

    this.attachment = piSession.attachView(
      'editor-panel',
      (msg) => void webview.postMessage(msg),
    );
    this.attachment.setVisible(this.panel.visible);

    this.panel.onDidChangeViewState(() => {
      this.attachment.setVisible(this.panel.visible);
    });

    webview.onDidReceiveMessage((msg: { type: string; data?: string; cols?: number; rows?: number }) => {
      if (msg.type === 'input' && msg.data !== undefined) {
        piSession.write(msg.data);
      } else if (msg.type === 'resize' && msg.cols !== undefined && msg.rows !== undefined) {
        this.attachment.setSize(msg.cols, msg.rows);
      }
    });

    this.panel.onDidDispose(() => {
      this.attachment.dispose();
      PiPanel.instance = undefined;
    });
  }
}
