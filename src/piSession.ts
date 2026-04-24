import * as nodePty from 'node-pty';
import type { IPty } from 'node-pty';

export interface PiSpawnConfig {
  file: string;
  args: string[];
  env: Record<string, string | undefined>;
}

type PtySpawnFn = typeof nodePty.spawn;

type PiSessionMessage =
  | { type: 'scrollback'; data: string }
  | { type: 'data'; data: string }
  | { type: 'exit'; code: number | undefined };

const SCROLLBACK_CAP = 500 * 1024;

export class PiSession {
  private readonly pty: IPty;
  private scrollback = '';
  private readonly senders = new Set<(msg: PiSessionMessage) => void>();

  constructor(config: PiSpawnConfig, ptySpawn: PtySpawnFn = nodePty.spawn) {
    this.pty = ptySpawn(config.file, config.args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      env: config.env,
    });

    this.pty.onData((data) => {
      this.scrollback += data;
      if (this.scrollback.length > SCROLLBACK_CAP) {
        this.scrollback = this.scrollback.slice(this.scrollback.length - SCROLLBACK_CAP);
      }
      for (const sender of this.senders) {
        sender({ type: 'data', data });
      }
    });

    this.pty.onExit(({ exitCode }) => {
      for (const sender of this.senders) {
        sender({ type: 'exit', code: exitCode });
      }
    });
  }

  addSender(fn: (msg: PiSessionMessage) => void): () => void {
    this.senders.add(fn);
    fn({ type: 'scrollback', data: this.scrollback });
    return () => this.senders.delete(fn);
  }

  getScrollback(): string {
    return this.scrollback;
  }

  write(data: string): void {
    this.pty.write(data);
  }

  resize(cols: number, rows: number): void {
    this.pty.resize(cols, rows);
  }

  dispose(): void {
    this.pty.kill();
    this.senders.clear();
  }
}
