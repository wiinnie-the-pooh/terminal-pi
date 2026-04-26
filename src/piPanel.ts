import * as vscode from 'vscode';
import type { PiSession, PiViewAttachment } from './piSession';
import { generateNonce, getWebviewTemplate } from './webviewTemplate';

export class PiPanel {
  private static readonly panels = new Set<PiPanel>();
  private static nextId = 0;

  private readonly panel: vscode.WebviewPanel;
  private readonly attachment: PiViewAttachment;

  static createOrReveal(getSession: () => PiSession, extensionUri: vscode.Uri): void {
    const first = PiPanel.panels.values().next().value;
    if (first) {
      first.panel.reveal();
      first.attachment.setVisible(true);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
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

    new PiPanel(panel, getSession(), extensionUri);
  }

  static restore(panel: vscode.WebviewPanel, getSession: () => PiSession, extensionUri: vscode.Uri): void {
    new PiPanel(panel, getSession(), extensionUri);
  }

  static split(getSession: () => PiSession, extensionUri: vscode.Uri): void {
    if (PiPanel.panels.size === 0) {
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'piBay.panel',
      'Pi Editor View',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'resources', 'webview'),
        ],
      },
    );

    new PiPanel(panel, getSession(), extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, piSession: PiSession, extensionUri: vscode.Uri) {
    this.panel = panel;

    const webview = this.panel.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, 'resources', 'webview'),
      ],
    };

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
      `editor-panel-${PiPanel.nextId++}`,
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

    PiPanel.panels.add(this);

    this.panel.onDidDispose(() => {
      this.attachment.dispose();
      PiPanel.panels.delete(this);
    });
  }
}
