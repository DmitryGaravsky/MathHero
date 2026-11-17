import { operandPairId, type ColumnOperation } from "../engine/column/arithmetic";
import type { ColumnInput } from "../engine/column/draft";
import { columnRandomIndex } from "../engine/column/generator";
import { columnPolicy } from "../engine/column/policy";
import {
  applyColumnEvent,
  checkpointColumnDraft,
  emptyColumnCursor,
  type ColumnAction,
  type ColumnJournalEntry,
  type ColumnRevision,
  type ColumnSession,
} from "../engine/column/session";
import type { Clock, RandomSource } from "../engine/core/Exercise";
import { ColumnSeen } from "./columnSeen";
import { db, type ColumnSessionRow, type ColumnStateRow, type MathHeroDB } from "./db";
import { sessionTransaction } from "./sessionTransaction";

export interface ColumnSessionVersion extends ColumnRevision {
  readonly sessionId: string;
}

export interface ColumnSnapshot {
  readonly session: ColumnSession;
  readonly token: ColumnSessionVersion;
}

export interface ColumnOpenState {
  readonly generation: string;
  readonly open: ColumnSnapshot | null;
}

export type ColumnCommand = Exclude<ColumnAction, { type: "start" }>;

interface DraftCheckpoint {
  readonly input: ColumnInput;
  readonly activeMs: number;
}

export class StaleColumnSessionError extends Error {
  constructor() {
    super("Column practice changed in another view");
    this.name = "StaleColumnSessionError";
  }
}

const initialState: ColumnStateRow = {
  id: "state",
  generation: "initial",
  cursor: emptyColumnCursor,
};

function snapshot(row: ColumnSessionRow, generation: string): ColumnSnapshot {
  const { session, owner, revision } = row;
  return { session, token: { sessionId: session.id, generation, owner, revision } };
}

function matches(row: ColumnSessionRow, expected: ColumnSessionVersion) {
  return row.session.id === expected.sessionId &&
    row.owner === expected.owner && row.revision === expected.revision;
}

export function columnSessionRow(session: ColumnSession): ColumnSessionRow {
  return {
    session,
    owner: null,
    revision: 0,
    ...(session.end ? {} : { openOperation: session.operation }),
  };
}

export function columnTables(database: MathHeroDB) {
  return [
    database.columnSessions, database.columnState, database.columnJournal,
    database.columnAttempts, database.columnProgress, database.columnSeen,
  ];
}

export class ColumnRepository {
  constructor(
    private readonly database: MathHeroDB = db,
    private readonly clock: Clock = { now: () => Date.now() },
    private readonly random: RandomSource = { next: () => Math.random() },
    private readonly newId: () => string = () => crypto.randomUUID(),
    private readonly timeZone: () => string = () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  ) {}

  private async state() {
    return await this.database.columnState.get("state") ?? initialState;
  }

  private openRow(operation: ColumnOperation) {
    return this.database.columnSessions.get({ openOperation: operation });
  }

  /** Read before explicit Start/Resume. The claim compares the observed version within its write transaction. */
  readOpen(operation: ColumnOperation): Promise<ColumnOpenState> {
    const { columnSessions, columnState } = this.database;
    return this.database.transaction("r", [columnSessions, columnState], async () => {
      const { generation } = await this.state();
      const row = await this.openRow(operation);
      return { generation, open: row ? snapshot(row, generation) : null };
    });
  }

  claim(operation: ColumnOperation, expected: ColumnOpenState, owner: string, signal?: AbortSignal) {
    return sessionTransaction(this.database, columnTables(this.database), signal, async () => {
      if (!owner) throw new Error("Column claim needs an owner");
      const state = await this.state();
      const current = await this.openRow(operation);
      const token = expected.open?.token;
      if (state.generation !== expected.generation ||
          (current ? !token || token.generation !== state.generation || !matches(current, token) : token)) {
        throw new StaleColumnSessionError();
      }
      if (current) return this.write(current.session, owner, current.revision + 1, state.generation);

      const entry: ColumnJournalEntry = {
        type: "start", operation, policyVersion: columnPolicy.version,
        sessionId: `column:${this.newId()}`, sequence: state.cursor.sequence + 1, at: this.clock.now(),
        seed: columnRandomIndex(2 ** 32, this.random), timeZone: this.timeZone(),
      };
      const session = await this.append(state, operation, entry);
      return this.write(session, owner, 1, state.generation, true);
    });
  }

  checkpoint(expected: ColumnSessionVersion, input: ColumnInput, activeMs: number, signal?: AbortSignal) {
    return this.saveDraft(expected, { input, activeMs }, false, signal);
  }

  /** Pause or exit can commit the last answering edit and relinquish the owner in one write. */
  release(expected: ColumnSessionVersion, checkpoint?: DraftCheckpoint, signal?: AbortSignal) {
    return this.saveDraft(expected, checkpoint, true, signal);
  }

  private saveDraft(expected: ColumnSessionVersion, checkpoint: DraftCheckpoint | undefined, release: boolean, signal?: AbortSignal) {
    const { columnSessions, columnState } = this.database;
    return sessionTransaction(this.database, [columnSessions, columnState], signal, async () => {
      const { generation } = await this.state();
      const row = await this.current(expected, generation);
      const session = checkpoint
        ? checkpointColumnDraft(row.session, checkpoint.input, checkpoint.activeMs)
        : row.session;
      return this.write(session, release ? null : row.owner, row.revision + 1, generation);
    });
  }

  /** Call only with the token from the last accepted write. An advance never claims. */
  act(expected: ColumnSessionVersion, command: ColumnCommand, signal?: AbortSignal) {
    return sessionTransaction(this.database, columnTables(this.database), signal, async () => {
      const state = await this.state();
      const row = await this.current(expected, state.generation);
      const session = await this.append(state, row.session.operation, {
        ...command, sessionId: row.session.id, sequence: state.cursor.sequence + 1, at: this.clock.now(),
      }, row.session);
      return this.write(session, session.end ? null : row.owner, row.revision + 1, state.generation);
    });
  }

  private async current(expected: ColumnSessionVersion, generation: string) {
    const row = await this.database.columnSessions.get(expected.sessionId);
    if (!row || !row.openOperation || !expected.owner || expected.generation !== generation || !matches(row, expected)) {
      throw new StaleColumnSessionError();
    }
    return row;
  }

  private async write(session: ColumnSession, owner: string | null, revision: number, generation: string, insert = false) {
    const row = { ...columnSessionRow(session), owner, revision };
    if (insert) await this.database.columnSessions.add(row);
    else await this.database.columnSessions.put(row);
    return snapshot(row, generation);
  }

  private async append(state: ColumnStateRow, operation: ColumnOperation, entry: ColumnJournalEntry, session?: ColumnSession) {
    const { columnProgress, columnSeen, columnJournal, columnAttempts, columnState } = this.database;
    const rows = await columnProgress.where("[operation+skill]").between(
      [operation, ""], [operation, "\uffff"], true, true,
    ).toArray();
    const canIssue = entry.type === "start" ||
      ((entry.type === "advance" || entry.type === "skip") && session!.order.length < columnPolicy.sessionLength);
    const seen = canIssue ? new ColumnSeen(operation, (await columnSeen.get(operation))?.bits) : null;
    const result = applyColumnEvent({
      session, cursor: state.cursor, progress: new Map(rows.map((row) => [row.skill, row])),
      seen: seen ?? { has: () => false },
    }, entry);
    await columnJournal.add(entry);
    if (result.attempt) await columnAttempts.add(result.attempt);
    if (result.changedProgress.length) await columnProgress.bulkPut(result.changedProgress);
    if (result.issued && seen!.add(operandPairId(result.issued.exercise))) {
      await columnSeen.put({ operation, bits: seen!.bits });
    }
    await columnState.put({ ...state, cursor: result.cursor });
    return result.session;
  }
}
