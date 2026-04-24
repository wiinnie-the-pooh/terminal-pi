const fs = require('fs');
const path = require('path');

const dest = path.join(__dirname, '..', 'resources', 'webview');
fs.mkdirSync(dest, { recursive: true });

const copies = [
  ['@xterm/xterm/lib/xterm.js', 'xterm.js'],
  ['@xterm/xterm/css/xterm.css', 'xterm.css'],
  ['@xterm/addon-fit/lib/addon-fit.js', 'xterm-addon-fit.js'],
];

for (const [src, dst] of copies) {
  fs.copyFileSync(
    path.join(__dirname, '..', 'node_modules', src),
    path.join(dest, dst),
  );
}
console.log('Webview assets copied to resources/webview/.');
