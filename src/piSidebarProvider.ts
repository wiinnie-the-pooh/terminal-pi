import * as vscode from 'vscode';
import type { PiSession } from './piSession';
import { generateNonce, getWebviewTemplate } from './webviewTemplate';

export class PiSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'piBay.session';

  constructor(
    private readonly piSession: PiSession,
    private readonly extensionUri: vscode.Uri,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    const webview = webviewView.webview;

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

    const unsubscribe = this.piSession.addSender(
      (msg) => void webview.postMessage(msg),
    );

    webview.onDidReceiveMessage((msg: { type: string; data?: string; cols?: number; rows?: number }) => {
      if (msg.type === 'input' && msg.data !== undefined) {
        this.piSession.write(msg.data);
      } else if (msg.type === 'resize' && msg.cols !== undefined && msg.rows !== undefined) {
        this.piSession.resize(msg.cols, msg.rows);
      }
    });

    webviewView.onDidDispose(() => unsubscribe());
  }
}
