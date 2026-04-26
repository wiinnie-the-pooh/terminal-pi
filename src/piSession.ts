import type * as nodePty from 'node-pty';
import type { IPty } from 'node-pty';

export interface PiSpawnConfig {
  file: string;
  args: string[];
  env: Record<string, string | undefined>;
  cwd?: string;
}

type PtySpawnFn = typeof nodePty.spawn;

export type PiSessionMessage =
  | { type: 'scrollback'; data: string }
  | { type: 'data'; data: string }
  | { type: 'exit'; code: number | undefined };

export interface PiViewAttachment {
  setVisible(visible: boolean): void;
  setSize(cols: number, rows: number): void;
  dispose(): void;
}

interface PiViewAttachmentState {
  id: string;
  send: (msg: PiSessionMessage) => void;
  visible: boolean;
  cols: number | undefined;
  rows: number | undefined;
}

interface VisibleSizedPiViewAttachmentState extends PiViewAttachmentState {
  visible: true;
  cols: number;
  rows: number;
}

function isVisibleSizedAttachment(
  attachment: PiViewAttachmentState,
): attachment is VisibleSizedPiViewAttachmentState {
  return attachment.visible && attachment.cols !== undefined && attachment.rows !== undefined;
}

const SCROLLBACK_CAP = 500 * 1024;

export class PiSession {
  private readonly pty: IPty;
  private scrollback = '';
  private legacySenderId = 0;
  private effectiveCols = 80;
  private effectiveRows = 24;
  private readonly attachments = new Set<PiViewAttachmentState>();

  constructor(config: PiSpawnConfig, ptySpawn: PtySpawnFn) {
    this.pty = ptySpawn(config.file, config.args, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      env: config.env,
      cwd: config.cwd,
    });

    this.pty.onData((data) => {
      this.scrollback += data;
      if (this.scrollback.length > SCROLLBACK_CAP) {
        this.scrollback = this.scrollback.slice(this.scrollback.length - SCROLLBACK_CAP);
      }
      this.broadcast({ type: 'data', data });
    });

    this.pty.onExit(({ exitCode }) => {
      this.broadcast({ type: 'exit', code: exitCode });
    });
  }

  addSender(fn: (msg: PiSessionMessage) => void): () => void {
    const attachment = this.attachView(`legacy-sender-${this.legacySenderId++}`, fn);
    return () => attachment.dispose();
  }

  attachView(id: string, send: (msg: PiSessionMessage) => void): PiViewAttachment {
    const state: PiViewAttachmentState = {
      id,
      send,
      visible: false,
      cols: undefined,
      rows: undefined,
    };

    this.attachments.add(state);
    send({ type: 'scrollback', data: this.scrollback });

    return {
      setVisible: (visible: boolean) => {
        state.visible = visible;
        this.recomputeEffectiveSize();
      },
      setSize: (cols: number, rows: number) => {
        state.cols = cols;
        state.rows = rows;
        this.recomputeEffectiveSize();
      },
      dispose: () => {
        this.attachments.delete(state);
        this.recomputeEffectiveSize();
      },
    };
  }

  getScrollback(): string {
    return this.scrollback;
  }

  write(data: string): void {
    this.pty.write(data);
  }

  resize(cols: number, rows: number): void {
    this.effectiveCols = cols;
    this.effectiveRows = rows;
    this.pty.resize(cols, rows);
  }

  dispose(): void {
    this.pty.kill();
    this.attachments.clear();
  }

  private broadcast(msg: PiSessionMessage): void {
    for (const attachment of this.attachments) {
      attachment.send(msg);
    }
  }

  private recomputeEffectiveSize(): void {
    const visibleAttachments = [...this.attachments].filter(isVisibleSizedAttachment);
    if (visibleAttachments.length === 0) {
      return;
    }

    const narrowest = visibleAttachments.reduce((current, next) => {
      if (next.cols < current.cols) {
        return next;
      }
      if (next.cols === current.cols && next.rows < current.rows) {
        return next;
      }
      return current;
    });

    if (narrowest.cols === this.effectiveCols && narrowest.rows === this.effectiveRows) {
      return;
    }

    this.effectiveCols = narrowest.cols;
    this.effectiveRows = narrowest.rows;
    this.pty.resize(narrowest.cols, narrowest.rows);
  }
}
