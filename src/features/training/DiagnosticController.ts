import type { Clock } from "../../engine/core/Exercise";
import { ActiveTimer } from "../../engine/sessions/ActiveTimer";
import type { DiagnosticSession } from "../../engine/sessions/diagnostic";
import type { Session } from "../../engine/learning/session";

export interface SessionRepository<S extends Session> {
  get(): Promise<S | undefined>;
  start(signal?: AbortSignal): Promise<S>;
  claim(owner: string, expected?: S, signal?: AbortSignal): Promise<S>;
  checkpoint(expected: S, activeMs: number, draft: string): Promise<void>;
  submit(expected: S, answer: number, activeMs: number, signal?: AbortSignal): Promise<S>;
  advance(expected: S, signal?: AbortSignal): Promise<S>;
  finish?(expected: S, signal?: AbortSignal): Promise<S>;
}

export interface DiagnosticView<S extends Session = DiagnosticSession> {
  loading: boolean;
  session: S | null;
  active: boolean;
  paused: boolean;
  busy: boolean;
  error: boolean;
  draft: string;
}

/** Coordinates the practice view, question timer and cancellable repository operations. */
export class DiagnosticController<S extends Session = DiagnosticSession> {
  private view: DiagnosticView<S> = {
    loading: true,
    session: null,
    active: true,
    paused: true,
    busy: false,
    error: false,
    draft: "",
  };
  private listeners = new Set<() => void>();
  private timer: ActiveTimer;
  private checkpointWrites = 0;
  private operations = new AbortController();
  private attached = true;

  constructor(
    private readonly repository: SessionRepository<S>,
    private readonly clock: Clock = { now: () => performance.now() },
    private readonly owner: string = crypto.randomUUID(),
  ) {
    this.timer = new ActiveTimer(clock);
  }

  getSnapshot = () => this.view;

  attach(active = true) {
    this.attached = true;
    this.update({ active });
  }

  detach() {
    const checkpoint = this.setActive(false);
    this.attached = false;
    return checkpoint;
  }

  setActive(active: boolean) {
    if (!this.attached || active === this.view.active) return;
    if (active) {
      this.update({ active: true });
      return this.load();
    }
    this.cancelOperations();
    this.timer.pause();
    this.update({
      active: false,
      busy: false,
      paused: this.view.session?.phase === "question" || this.view.paused,
    });
    return this.saveCheckpoint(true);
  }

  private cancelOperations() {
    this.operations.abort();
    this.operations = new AbortController();
  }

  private valid(signal: AbortSignal) {
    return this.attached && this.view.active && !signal.aborted;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(patch: Partial<DiagnosticView<S>>) {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private accept(session: S | null, paused: boolean) {
    this.timer = new ActiveTimer(this.clock, session?.activeMs ?? 0);
    this.update({
      loading: false,
      busy: false,
      error: false,
      session,
      paused,
      draft: session?.draft ?? "",
    });
  }

  private fail() {
    this.timer.pause();
    this.update({ loading: false, busy: false, error: true, paused: true });
  }

  async load() {
    if (!this.view.active || !this.attached) return;
    this.cancelOperations();
    this.timer.pause();
    const { signal } = this.operations;
    const previous = this.view.session;
    const manuallyPausedFeedback = previous?.phase === "feedback" && this.view.paused;
    this.update({ loading: true, busy: false });
    try {
      const existing = await this.repository.get();
      if (!this.valid(signal)) return;
      const sameFeedback = existing?.id === previous?.id && existing?.cursor === previous?.cursor;
      this.accept(existing ?? null, existing?.phase !== "feedback" ||
        (manuallyPausedFeedback && sameFeedback));
    } catch {
      if (this.valid(signal)) this.fail();
    }
  }

  private async run(write: (signal: AbortSignal) => Promise<S>) {
    const { signal } = this.operations;
    if (!this.valid(signal) || this.view.busy) return;
    this.update({ busy: true });
    try {
      const session = await write(signal);
      if (this.valid(signal)) this.accept(session, false);
    } catch {
      if (this.valid(signal)) this.fail();
    }
  }

  start() {
    return this.run(async (signal) => {
      const started = await this.repository.start(signal);
      signal.throwIfAborted();
      return this.repository.claim(this.owner, started, signal);
    });
  }

  resume() {
    const { session, paused } = this.view;
    if (!session || !paused || session.phase !== "question") return;
    return this.run((signal) => this.repository.claim(this.owner, session, signal));
  }

  /** Begin question timing once the active question DOM has committed. */
  reveal() {
    if (
      this.valid(this.operations.signal) &&
      !this.view.paused &&
      !this.view.busy &&
      !this.view.loading &&
      !this.view.error &&
      this.view.session?.phase === "question"
    )
      this.timer.resume();
  }

  setDraft(draft: string) {
    if (
      !this.valid(this.operations.signal) ||
      this.view.paused ||
      this.view.busy ||
      this.view.loading ||
      this.view.error ||
      this.view.session?.phase !== "question"
    )
      return;
    this.update({ draft });
    void this.saveCheckpoint(true);
  }

  async saveCheckpoint(force = false) {
    const { session, draft, busy, error } = this.view;
    if (
      !session ||
      session.owner !== this.owner ||
      session.phase !== "question" ||
      busy ||
      error ||
      (!force && (!this.view.active || this.view.paused || this.checkpointWrites > 0))
    )
      return;
    this.checkpointWrites++;
    const { signal } = this.operations;
    try {
      await this.repository.checkpoint(session, this.timer.read(), draft);
    } catch {
      if (this.valid(signal)) this.fail();
    } finally {
      this.checkpointWrites--;
    }
  }

  pause = () => {
    if (!this.valid(this.operations.signal)) return;
    const { busy } = this.view;
    if (busy) this.cancelOperations();
    this.timer.pause();
    this.update({ paused: true, busy: false });
    const checkpoint = this.saveCheckpoint(true);
    if (busy) return checkpoint.then(() => this.load());
    return checkpoint;
  };

  submit() {
    const { session, draft, paused, error, loading } = this.view;
    if (!session || session.phase !== "question" || paused || error || loading ||
      !this.valid(this.operations.signal) || this.view.busy || !/^\d{1,3}$/.test(draft)
    ) return;
    const elapsed = this.timer.pause();
    return this.run((signal) => this.repository.submit(session, Number(draft), elapsed, signal));
  }

  next() {
    const { session, error, loading } = this.view;
    if (!session || error || loading ||
      (session.phase !== "feedback" && session.phase !== "break")
    ) return;
    return this.run(async (signal) => {
      const claimed = await this.repository.claim(this.owner, session, signal);
      signal.throwIfAborted();
      return this.repository.advance(claimed, signal);
    });
  }

  canAdvanceAutomatically(expected: S) {
    const { session, paused, busy, loading, error } = this.view;
    return this.valid(this.operations.signal) && !paused && !busy && !loading && !error &&
      session === expected && expected.owner === this.owner && expected.phase === "feedback" &&
      expected.lastAttempt?.correct === true;
  }

  /** Advance the exact owned feedback snapshot without reclaiming another view's session. */
  advanceCorrectFeedback(expected: S) {
    if (!this.canAdvanceAutomatically(expected)) return;
    return this.run((signal) => this.repository.advance(expected, signal));
  }

  finish() {
    const { session, busy, error, loading } = this.view;
    const finish = this.repository.finish?.bind(this.repository);
    if (!session || busy || error || loading || !finish || !this.valid(this.operations.signal)) return;
    this.timer.pause();
    return this.run(async (signal) => {
      const claimed = await this.repository.claim(this.owner, session, signal);
      signal.throwIfAborted();
      return finish(claimed, signal);
    });
  }
}
