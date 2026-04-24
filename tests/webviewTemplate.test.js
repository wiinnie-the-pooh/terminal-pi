const test = require('node:test');
const assert = require('node:assert/strict');

// webviewTemplate has no vscode dependency -- no stub needed
const { getWebviewTemplate, generateNonce } = require('../out/webviewTemplate.js');

const OPTS = {
  cspSource: 'https://vscode-cdn.example.net',
  nonce: 'testNonce123',
  xtermJsUri: 'https://vscode-cdn.example.net/xterm.js',
  xtermCssUri: 'https://vscode-cdn.example.net/xterm.css',
  xtermAddonFitUri: 'https://vscode-cdn.example.net/xterm-addon-fit.js',
};

test('getWebviewTemplate includes the nonce on every script tag', () => {
  const html = getWebviewTemplate(OPTS);
  const scriptTags = [...html.matchAll(/<script[^>]*>/g)].map(m => m[0]);
  assert.ok(scriptTags.length > 0);
  assert.ok(scriptTags.every(tag => tag.includes('nonce="testNonce123"')));
});

test('getWebviewTemplate includes the xterm.js URI', () => {
  assert.ok(getWebviewTemplate(OPTS).includes(OPTS.xtermJsUri));
});

test('getWebviewTemplate includes the xterm.css URI', () => {
  assert.ok(getWebviewTemplate(OPTS).includes(OPTS.xtermCssUri));
});

test('getWebviewTemplate includes the addon-fit URI', () => {
  assert.ok(getWebviewTemplate(OPTS).includes(OPTS.xtermAddonFitUri));
});

test('getWebviewTemplate includes the CSP source in the meta tag', () => {
  assert.ok(getWebviewTemplate(OPTS).includes(OPTS.cspSource));
});

test('generateNonce returns a 32-character alphanumeric string', () => {
  const nonce = generateNonce();
  assert.match(nonce, /^[A-Za-z0-9]{32}$/);
});

test('generateNonce returns a different value on each call', () => {
  assert.notEqual(generateNonce(), generateNonce());
});
