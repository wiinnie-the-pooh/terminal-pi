import * as vscode from 'vscode';

export class PiSessionFs implements vscode.FileSystemProvider {
  private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile = this.emitter.event;

  watch(): vscode.Disposable {
    return { dispose() {} };
  }

  stat(): vscode.FileStat {
    return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: 0 };
  }

  readDirectory(): [string, vscode.FileType][] {
    return [];
  }

  createDirectory(): void {}

  readFile(): Uint8Array {
    return new Uint8Array();
  }

  writeFile(): void {}

  delete(): void {}

  rename(): void {}
}
