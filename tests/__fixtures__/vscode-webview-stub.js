module.exports = {
  ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
  Uri: {
    joinPath(base, ...parts) {
      const p = typeof base === 'string' ? base : (base.path ?? '');
      return { path: [p, ...parts].join('/') };
    },
  },
  ViewColumn: { One: 1 },
  window: {
    createWebviewPanel(viewType, title, column, options) {
      let disposeHandler = null;
      let messageHandler = null;
      const posted = [];
      const panel = {
        webview: {
          html: '',
          cspSource: 'test-csp',
          options: {},
          asWebviewUri(uri) { return { toString: () => `webview:${uri.path}` }; },
          onDidReceiveMessage(h) { messageHandler = h; return { dispose: () => {} }; },
          postMessage(m) { posted.push(m); },
        },
        reveal() { panel.__revealed = true; },
        __revealed: false,
        __posted: posted,
        onDidDispose(h) { disposeHandler = h; return { dispose: () => {} }; },
        __triggerDispose() { disposeHandler?.(); },
        __triggerMessage(msg) { messageHandler?.(msg); },
      };
      module.exports.window.__lastPanel = panel;
      return panel;
    },
    __lastPanel: null,
    onDidCloseTerminal: () => ({ dispose: () => {} }),
    showErrorMessage: async () => undefined,
    registerWebviewViewProvider: () => ({ dispose: () => {} }),
  },
};
