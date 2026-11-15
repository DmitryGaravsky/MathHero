import type { Clock } from "../core/Exercise";

/** Inject a monotonic clock (performance.now in the browser). Never persist its origin. */
export class ActiveTimer {
  private since: number | null = null;
  constructor(
    private readonly clock: Clock,
    private elapsed = 0,
  ) {}
  resume() {
    if (this.since === null) this.since = this.clock.now();
  }
  pause() {
    this.elapsed = this.read();
    this.since = null;
    return this.elapsed;
  }
  read() {
    return (
      this.elapsed +
      (this.since === null ? 0 : Math.max(0, this.clock.now() - this.since))
    );
  }
}
