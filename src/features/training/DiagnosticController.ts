import type { Clock } from "../../engine/core/Exercise";
import { ActiveTimer } from "../../engine/sessions/ActiveTimer";
import type { DiagnosticSession } from "../../engine/sessions/diagnostic";
import { diagnosticRepository } from "../../database/diagnosticRepository";

import type { Session } from "../../engine/learning/session";

export interface SessionRepository<S extends Session> {
  get(): Promise<S | undefined>;
  start(): Promise<S>;
  claim(owner: string, expected?: S, isActive?: () => boolean): Promise<S>;
  checkpoint(expected: S, activeMs: number, draft: string): Promise<void>;
  submit(expected: S, answer: number, activeMs: number): Promise<S>;
  advance(expected: S): Promise<S>;
  finish?(expected: S): Promise<S>;
}
export interface DiagnosticView<S extends Session = DiagnosticSession> {
  loading: boolean;
  session: S | null;
  paused: boolean;
  busy: boolean;
  error: boolean;
  draft: string;
}
/** Application controller: no React, DOM or wall-clock timing dependencies. */
export class DiagnosticController<S extends Session = DiagnosticSession> {
  private view: DiagnosticView<S> = {
    loading: true,
    session: null,
    paused: true,
    busy: false,
    error: false,
    draft: "",
  };
  private listeners = new Set<() => void>();
  private timer: ActiveTimer;
  private checkpointPending = false;
  private owner: string;
  private generation = 0;
  private attached = true;
  constructor(
    private readonly repository: SessionRepository<S> = diagnosticRepository as unknown as SessionRepository<S>,
    private readonly clock: Clock = { now: () => performance.now() },
    owner: string = crypto.randomUUID(),
  ) {
    this.owner = owner;
    this.timer = new ActiveTimer(clock);
  }
  getSnapshot = () => this.view;
  attach() {
    this.attached = true;
  }
  detach() {
    this.attached = false;
    this.generation++;
    return this.pause();
  }
  private valid(generation: number) {
    return this.attached && this.generation === generation;
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
  private accept(session: S | null, paused = true) {
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
    const generation = ++this.generation;
    try {
      const existing = await this.repository.get();
      if (this.valid(generation)) this.accept(existing ?? null);
    } catch {
      if (this.valid(generation)) this.fail();
    }
  }
  async start() {
    if (this.view.busy) return;
    const generation = this.generation;
    this.update({ busy: true });
    try {
      await this.repository.start();
      if (!this.valid(generation)) return;
      const session = await this.repository.claim(this.owner, undefined, () =>
        this.valid(generation),
      );
      if (this.valid(generation)) this.accept(session, false);
    } catch {
      if (this.valid(generation)) this.fail();
    }
  }
  async resume() {
    if (this.view.busy) return;
    const generation = this.generation;
    this.update({ busy: true });
    try {
      const session = await this.repository.claim(
        this.owner,
        this.view.session ?? undefined,
        () => this.valid(generation),
      );
      if (this.valid(generation)) this.accept(session, false);
    } catch {
      if (this.valid(generation)) this.fail();
    }
  }
  /** Called after the question DOM commits, not while a database request is pending. */
  reveal() {
    if (
      !this.view.paused &&
      !this.view.busy &&
      !this.view.error &&
      this.view.session?.phase === "question"
    )
      this.timer.resume();
  }
  setDraft(draft: string) {
    if (
      this.view.paused ||
      this.view.busy ||
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
      (!force && (this.view.paused || this.checkpointPending))
    )
      return;
    this.checkpointPending = true;
    const generation = this.generation;
    try {
      await this.repository.checkpoint(session, this.timer.read(), draft);
    } catch {
      if (this.valid(generation)) this.fail();
    } finally {
      this.checkpointPending = false;
    }
  }
  pause = () => {
    this.timer.pause();
    this.update({ paused: true });
    return this.saveCheckpoint(true);
  };
  async submit() {
    const { session, draft, busy, paused, error } = this.view;
    if (
      !session ||
      session.phase !== "question" ||
      busy ||
      paused ||
      error ||
      !/^\d{1,3}$/.test(draft)
    )
      return;
    const elapsed = this.timer.pause();
    const generation = this.generation;
    this.update({ busy: true }); // Synchronous guard, before the first await.
    try {
      const next = await this.repository.submit(
        session,
        Number(draft),
        elapsed,
      );
      if (this.valid(generation)) this.accept(next);
    } catch {
      if (this.valid(generation)) this.fail();
    }
  }
  async next() {
    const { session, busy, error } = this.view;
    if (!session || busy || error) return;
    const generation = this.generation;
    this.update({ busy: true });
    try {
      const claimed = await this.repository.claim(this.owner, session, () =>
        this.valid(generation),
      );
      if (!this.valid(generation)) return;
      const next = await this.repository.advance(claimed);
      if (this.valid(generation)) this.accept(next, false);
    } catch {
      if (this.valid(generation)) this.fail();
    }
  }
  async finish() {
    const { session, busy, error } = this.view;
    if (!session || busy || error || !this.repository.finish) return;
    const generation = this.generation;
    this.timer.pause();
    this.update({ busy: true });
    try {
      const claimed = await this.repository.claim(this.owner, session, () =>
        this.valid(generation),
      );
      if (!this.valid(generation)) return;
      const completed = await this.repository.finish(claimed);
      if (this.valid(generation)) this.accept(completed);
    } catch {
      if (this.valid(generation)) this.fail();
    }
  }
}
