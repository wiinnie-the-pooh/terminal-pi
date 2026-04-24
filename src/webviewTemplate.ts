export interface WebviewTemplateOptions {
  cspSource: string;
  nonce: string;
  xtermJsUri: string;
  xtermCssUri: string;
  xtermAddonFitUri: string;
}

export function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getWebviewTemplate(opts: WebviewTemplateOptions): string {
  const { cspSource, nonce, xtermJsUri, xtermCssUri, xtermAddonFitUri } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    script-src 'nonce-${nonce}' ${cspSource};
    style-src 'unsafe-inline' ${cspSource};
  ">
  <link rel="stylesheet" href="${xtermCssUri}">
  <style>
    body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: transparent; }
    #terminal { height: 100%; }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <script nonce="${nonce}" src="${xtermJsUri}"></script>
  <script nonce="${nonce}" src="${xtermAddonFitUri}"></script>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const term = new Terminal({ convertEol: true });
    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(document.getElementById('terminal'));
    fitAddon.fit();

    term.onData(data => vscode.postMessage({ type: 'input', data }));

    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.type === 'data' || msg.type === 'scrollback') {
        term.write(msg.data);
      } else if (msg.type === 'exit') {
        term.write('\\r\\n[Process exited with code ' + msg.code + ']\\r\\n');
      }
    });

    const container = document.getElementById('terminal');
    new ResizeObserver(() => {
      fitAddon.fit();
      vscode.postMessage({ type: 'resize', cols: term.cols, rows: term.rows });
    }).observe(container);
  </script>
</body>
</html>`;
}
