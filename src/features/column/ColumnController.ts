import { StaleColumnSessionError, type ColumnCommand, type ColumnRepository, type ColumnSessionVersion, type ColumnSnapshot } from "../../database/columnRepository";
import type { ColumnOperation } from "../../engine/column/arithmetic";
import { columnInput, editColumnDraft, type ColumnEdit } from "../../engine/column/draft";
import type { ColumnSession } from "../../engine/column/session";
import type { Clock } from "../../engine/core/Exercise";
import { ActiveTimer } from "../../engine/sessions/ActiveTimer";

type Repository = Pick<ColumnRepository, "readOpen" | "claim" | "checkpoint" | "act" | "release">;
type Status = "loading" | "ready" | "paused" | "active" | "complete" | "stale" | "error";
type Action = ColumnCommand["type"];

interface View {
  status: Status;
  session: ColumnSession | null;
  busy: boolean;
  hintOpen: boolean;
  canActOnPausedDraft: boolean;
}

const delayFeedback = (callback: () => void) => {
  const id = setTimeout(callback, 800);
  return () => clearTimeout(id);
};

function sameVersion(current: ColumnSessionVersion, observed: ColumnSessionVersion | undefined) {
  return observed?.generation === current.generation && observed.sessionId === current.sessionId &&
    observed.owner === current.owner && observed.revision === current.revision;
}

export class ColumnController {
  private view: View = { status: "loading", session: null, busy: false, hintOpen: false, canActOnPausedDraft: false };
  private committed: ColumnSnapshot | null = null;
  private saved: ColumnSnapshot | null = null;
  private timer: ActiveTimer | null = null;
  private tail = Promise.resolve<unknown>(undefined);
  private checkpointQueued = false;
  private releaseWork: Promise<boolean> | null = null;
  private action: AbortController | null = null;
  private attached = false;
  private visible = false;
  private isForeground = () => true;
  private feedback: ColumnSnapshot | null = null;
  private cancelFeedback: (() => void) | null = null;
  private listeners = new Set<() => void>();

  constructor(
    private readonly operation: ColumnOperation,
    private readonly repository: Repository,
    private readonly owner: string,
    private readonly clock: Clock = { now: () => performance.now() },
    private readonly scheduleFeedback = delayFeedback,
  ) {}

  getSnapshot = () => this.view;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(patch: Partial<View>) {
    this.view = { ...this.view, ...patch };
    for (const notify of this.listeners) notify();
  }

  private enqueue<T>(run: () => Promise<T>) {
    const work = this.tail.then(run);
    this.tail = work.catch(() => undefined);
    return work;
  }

  private available() {
    return this.attached && this.visible && this.isForeground();
  }

  private ownsDraft() {
    return this.committed?.token.owner === this.owner && !!this.committed.session.draft;
  }

  attach(visible: boolean, isForeground = () => true) {
    this.attached = true;
    this.visible = visible;
    this.isForeground = isForeground;
  }

  detach() {
    this.attached = false;
    return this.pause();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) void this.pause();
  }

  /** Initial observation and error recovery never claim a session. */
  load() {
    if (!this.attached || (this.action && !this.action.signal.aborted) ||
        (this.ownsDraft() && !this.releaseWork)) return Promise.resolve(false);
    return this.runAction(async (signal) => {
      const { open } = await this.repository.readOpen(this.operation);
      if (signal.aborted) return;
      if (open) this.showPaused(open);
      else this.publish({ status: "ready", session: null, hintOpen: false, canActOnPausedDraft: false });
    });
  }

  enter() {
    if (!this.available() || (this.action && !this.action.signal.aborted) ||
        (this.ownsDraft() && !this.releaseWork)) return Promise.resolve(false);
    return this.runAction(async (signal) => {
      const observed = await this.repository.readOpen(this.operation);
      signal.throwIfAborted();
      if (!this.available()) return;
      const snapshot = await this.repository.claim(this.operation, observed, this.owner, signal);
      this.install(snapshot);
    });
  }

  actOnPausedDraft(type: "finish" | "skip") {
    const saved = this.saved;
    if (!this.available() || this.view.busy || this.view.status !== "paused" || !saved || saved.token.owner !== null ||
        (type === "skip" && saved.session.draft?.phase === "correct")) {
      return Promise.resolve(false);
    }
    return this.runAction(async (signal) => {
      if (!this.available()) return;
      const claimed = await this.repository.claim(this.operation, {
        open: saved, generation: saved.token.generation,
      }, this.owner, signal);
      this.install(claimed);
      signal.throwIfAborted();
      if (!this.available()) return;
      const snapshot = await this.repository.act(claimed.token, { type, ...this.capture() }, signal);
      this.install(snapshot);
    });
  }

  private runAction(work: (signal: AbortSignal) => Promise<void>) {
    const action = new AbortController();
    this.action = action;
    this.publish({ busy: true });
    return this.enqueue(async () => {
      try {
        action.signal.throwIfAborted();
        await work(action.signal);
        return !action.signal.aborted;
      } catch (error) {
        if (!action.signal.aborted) this.fail(error);
        return false;
      } finally {
        if (this.action === action) this.action = null;
        this.publish({ busy: !!(this.action || this.releaseWork) });
      }
    });
  }

  private install(snapshot: ColumnSnapshot, hintOpen = false, autoAdvance = false) {
    this.committed = snapshot;
    this.saved = null;
    this.timer = new ActiveTimer(this.clock, snapshot.session.activeMs);
    this.feedback = autoAdvance ? snapshot : null;
    this.publish({ status: snapshot.session.end ? "complete" : "active", session: snapshot.session, hintOpen, canActOnPausedDraft: false });
  }

  private showPaused(saved: ColumnSnapshot) {
    this.saved = saved;
    this.publish({ status: "paused", session: saved.session, hintOpen: false, canActOnPausedDraft: saved.token.owner === null });
  }

  private stopFeedback() {
    this.cancelFeedback?.();
    this.cancelFeedback = null;
    this.feedback = null;
  }

  private fail(error: unknown) {
    this.stopFeedback();
    this.action?.abort();
    this.timer = null;
    this.committed = null;
    this.saved = null;
    this.publish({ status: error instanceof StaleColumnSessionError ? "stale" : "error", hintOpen: false, canActOnPausedDraft: false });
  }

  /** Called after the active exercise and controls are committed to the visible DOM. */
  reveal() {
    const { busy, hintOpen, status, session } = this.view;
    if (!this.available() || busy || status !== "active") return;
    if (session?.draft?.phase === "answering" && !hintOpen) this.timer?.resume();
    const feedback = this.feedback;
    if (!feedback || this.cancelFeedback) return;
    this.cancelFeedback = this.scheduleFeedback(() => {
      if (this.available() && this.feedback === feedback && this.committed === feedback) void this.act("advance");
    });
  }

  conceal() {
    this.timer?.pause();
  }

  edit(edit: ColumnEdit) {
    const { session, busy } = this.view;
    if (!this.available() || busy || !this.ownsDraft() || session?.draft?.phase !== "answering") return;
    const draft = editColumnDraft(this.operation, session.draft, edit);
    this.publish({ session: { ...session, draft } });
    this.checkpoint();
  }

  private capture() {
    return { input: columnInput(this.view.session!.draft!), activeMs: this.timer!.read() };
  }

  private checkpoint() {
    if (this.checkpointQueued) return;
    this.checkpointQueued = true;
    void this.enqueue(async () => {
      this.checkpointQueued = false;
      if (!this.ownsDraft() || this.committed!.session.draft?.phase !== "answering") return;
      const { input, activeMs } = this.capture();
      try {
        this.committed = await this.repository.checkpoint(this.committed!.token, input, activeMs);
        // The displayed draft may already contain newer edits.
      } catch (error) {
        this.fail(error);
      }
    });
  }

  toggleHint() {
    const { session, hintOpen, busy } = this.view;
    if (!this.available() || busy || !this.ownsDraft() || session?.draft?.phase === "correct") return;
    if (hintOpen || session?.draft?.hintShown) {
      this.timer?.pause();
      this.publish({ hintOpen: !hintOpen });
    } else void this.act("hint");
  }

  act(type: Exclude<Action, "finish" | "skip">) {
    const { busy, session, hintOpen } = this.view;
    const draft = session?.draft;
    if (!this.available() || busy || !this.ownsDraft() || !draft ||
        (type === "check" && (draft.phase !== "answering" || draft.digits.every((digit) => digit === null))) ||
        (type === "retry" && draft.phase !== "incorrect") ||
        (type === "advance" && draft.phase !== "correct") ||
        (type === "hint" && draft.phase === "correct")) return Promise.resolve(false);

    this.stopFeedback();
    this.timer?.pause();
    return this.runAction(async (signal) => {
      if (!this.available()) return;
      const command: ColumnCommand = type === "advance" || type === "retry" ? { type } : { type, ...this.capture() };
      const snapshot = await this.repository.act(this.committed!.token, command, signal);
      const active = !signal.aborted && this.available();
      this.install(snapshot, active && (type === "hint" || (type === "retry" && hintOpen)),
        active && type === "check" && snapshot.session.draft?.phase === "correct");
    });
  }

  /** Edits drain even when React has already unmounted the view. */
  pause() {
    this.stopFeedback();
    this.timer?.pause();
    const pendingAction = this.action;
    pendingAction?.abort();
    if (this.releaseWork) return this.releaseWork;
    if (!this.ownsDraft() && !pendingAction) return Promise.resolve(this.view.status !== "error" && this.view.status !== "stale");
    this.publish({ busy: true, hintOpen: false });
    const release = this.enqueue(async () => {
      try {
        if (!this.ownsDraft()) return this.view.status !== "error" && this.view.status !== "stale";
        const saved = await this.repository.release(this.committed!.token,
          this.committed!.session.draft?.phase === "answering" ? this.capture() : undefined);
        this.committed = null;
        this.timer = null;
        this.showPaused(saved);
        return true;
      } catch (error) {
        this.fail(error);
        return false;
      } finally {
        this.releaseWork = null;
        this.publish({ busy: !!this.action });
      }
    });
    this.releaseWork = release;
    return release;
  }

  /** A storage notification may be our own write. Read after queued writes settle. */
  verifyOwnership(observed?: ColumnSessionVersion) {
    if (!this.ownsDraft() || sameVersion(this.committed!.token, observed)) return;
    return this.enqueue(async () => {
      if (!this.ownsDraft()) return;
      try {
        const { open } = await this.repository.readOpen(this.operation);
        if (!sameVersion(this.committed!.token, open?.token)) {
          this.fail(new StaleColumnSessionError());
        }
      } catch (error) {
        this.fail(error);
      }
    });
  }
}
