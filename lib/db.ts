// ─────────────────────────────────────────────────────────────────────────────
// THE DATA SEAM.
//
// This is the ONLY module in the app that knows about Dexie/IndexedDB. Every
// component and hook imports the `db` singleton and talks to the typed
// `AppRepository` interface below. To migrate to Supabase later, write a
// `SupabaseRepository implements AppRepository` and change the single
// `export const db = ...` line at the bottom. No UI changes required.
// ─────────────────────────────────────────────────────────────────────────────

import Dexie, { type Table, type UpdateSpec } from "dexie";
import type {
  BackupBundle,
  DailyMetric,
  Exercise,
  ExerciseStatus,
  LogEntry,
  NmesSession,
  PtNote,
  Session,
  Stage,
} from "./types";
import { newId } from "./id";
import { today } from "./date";
import { buildSeedData } from "./seed";

// ── Repository contract (storage-agnostic) ──────────────────────────────────

export interface CrudRepo<T> {
  getAll(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  add(item: T): Promise<string>;
  update(id: string, patch: Partial<T>): Promise<void>;
  remove(id: string): Promise<void>;
  bulkPut(items: T[]): Promise<void>;
}

export interface StageRepo extends CrudRepo<Stage> {
  liveAllOrdered(): Promise<Stage[]>;
  reorder(orderedIds: string[]): Promise<void>;
}

export interface ExerciseRepo extends CrudRepo<Exercise> {
  liveAll(): Promise<Exercise[]>;
  liveByStage(stageId: string): Promise<Exercise[]>;
  liveByStatus(status: ExerciseStatus): Promise<Exercise[]>;
  setStatus(id: string, status: ExerciseStatus): Promise<void>;
  reorderInStage(stageId: string, orderedIds: string[]): Promise<void>;
}

export interface SessionRepo extends CrudRepo<Session> {
  getActive(): Promise<Session | undefined>;
  liveActive(): Promise<Session | undefined>;
  start(date: string): Promise<Session>;
  end(id: string, notes?: string): Promise<void>;
  liveByDate(date: string): Promise<Session[]>;
  liveAllOrdered(): Promise<Session[]>;
}

export interface LogRepo extends CrudRepo<LogEntry> {
  liveAll(): Promise<LogEntry[]>;
  liveByDate(date: string): Promise<LogEntry[]>;
  liveBySession(sessionId: string): Promise<LogEntry[]>;
  liveByExercise(exerciseId: string): Promise<LogEntry[]>;
  /** Create or update today's entry for an exercise, attaching the active session. */
  upsertForExerciseToday(
    date: string,
    exerciseId: string,
    patch: Partial<LogEntry>,
    sessionId: string | null,
  ): Promise<void>;
}

export interface NmesRepo extends CrudRepo<NmesSession> {
  liveAllOrdered(): Promise<NmesSession[]>;
  liveByDate(date: string): Promise<NmesSession[]>;
}

export interface DailyMetricRepo extends CrudRepo<DailyMetric> {
  liveAllOrdered(): Promise<DailyMetric[]>;
  getByDate(date: string): Promise<DailyMetric | undefined>;
  upsertForDate(date: string, patch: Partial<DailyMetric>): Promise<void>;
}

export interface PtNoteRepo extends CrudRepo<PtNote> {
  liveAllOrdered(): Promise<PtNote[]>;
}

export interface MetaRepo {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
}

export interface AppRepository {
  stages: StageRepo;
  exercises: ExerciseRepo;
  sessions: SessionRepo;
  logs: LogRepo;
  nmes: NmesRepo;
  dailyMetrics: DailyMetricRepo;
  ptNotes: PtNoteRepo;
  meta: MetaRepo;
  exportAll(): Promise<BackupBundle>;
  importAll(bundle: BackupBundle): Promise<void>;
  /** Seed default ACL protocol on first run (guarded by a meta flag). */
  ensureSeeded(): Promise<void>;
  /** Wipe everything and reseed. */
  resetAndReseed(): Promise<void>;
}

// ── Dexie implementation ────────────────────────────────────────────────────

interface MetaRow {
  key: string;
  value: string;
}

const SEEDED_KEY = "seeded";

class AclRehabDB extends Dexie {
  stages!: Table<Stage, string>;
  exercises!: Table<Exercise, string>;
  sessions!: Table<Session, string>;
  logEntries!: Table<LogEntry, string>;
  nmesSessions!: Table<NmesSession, string>;
  dailyMetrics!: Table<DailyMetric, string>;
  ptNotes!: Table<PtNote, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("AclRehabDB");
    this.version(1).stores({
      stages: "id, order",
      exercises: "id, stageId, status, order, [stageId+order], [status+order]",
      sessions: "id, date, startedAt, endedAt",
      logEntries: "id, date, exerciseId, sessionId, [date+exerciseId]",
      nmesSessions: "id, date, sessionId",
      dailyMetrics: "id, date",
      ptNotes: "id, date",
      meta: "key",
    });
  }
}

// Lazily instantiate so this module is import-safe on the server. Dexie itself
// only touches IndexedDB when a query runs (which only happens in client
// components), but we still avoid constructing on the server.
let _dbInstance: AclRehabDB | null = null;
function idb(): AclRehabDB {
  if (!_dbInstance) _dbInstance = new AclRehabDB();
  return _dbInstance;
}

function makeCrud<T extends { id: string }>(table: () => Table<T, string>): CrudRepo<T> {
  return {
    getAll: () => table().toArray(),
    get: (id) => table().get(id),
    add: async (item) => {
      await table().add(item);
      return item.id;
    },
    update: async (id, patch) => {
      await table().update(id, patch as UpdateSpec<T>);
    },
    remove: async (id) => {
      await table().delete(id);
    },
    bulkPut: async (items) => {
      await table().bulkPut(items);
    },
  };
}

class DexieRepository implements AppRepository {
  stages: StageRepo = {
    ...makeCrud<Stage>(() => idb().stages),
    liveAllOrdered: () => idb().stages.orderBy("order").toArray(),
    reorder: async (orderedIds) => {
      await idb().transaction("rw", idb().stages, async () => {
        await Promise.all(
          orderedIds.map((id, i) => idb().stages.update(id, { order: i })),
        );
      });
    },
  };

  exercises: ExerciseRepo = {
    ...makeCrud<Exercise>(() => idb().exercises),
    liveAll: () => idb().exercises.toArray(),
    liveByStage: (stageId) =>
      idb().exercises.where("[stageId+order]").between([stageId, Dexie.minKey], [stageId, Dexie.maxKey]).toArray(),
    liveByStatus: (status) =>
      idb().exercises.where("[status+order]").between([status, Dexie.minKey], [status, Dexie.maxKey]).toArray(),
    setStatus: async (id, status) => {
      await idb().exercises.update(id, { status });
    },
    reorderInStage: async (_stageId, orderedIds) => {
      await idb().transaction("rw", idb().exercises, async () => {
        await Promise.all(
          orderedIds.map((id, i) => idb().exercises.update(id, { order: i })),
        );
      });
    },
  };

  sessions: SessionRepo = {
    ...makeCrud<Session>(() => idb().sessions),
    getActive: () => idb().sessions.filter((s) => s.endedAt == null).first(),
    liveActive: () => idb().sessions.filter((s) => s.endedAt == null).first(),
    start: async (date) => {
      const session: Session = { id: newId(), date, startedAt: Date.now() };
      await idb().sessions.add(session);
      return session;
    },
    end: async (id, notes) => {
      const patch: Partial<Session> = { endedAt: Date.now() };
      if (notes !== undefined) patch.notes = notes;
      await idb().sessions.update(id, patch);
    },
    liveByDate: (date) => idb().sessions.where("date").equals(date).toArray(),
    liveAllOrdered: () => idb().sessions.orderBy("startedAt").toArray(),
  };

  logs: LogRepo = {
    ...makeCrud<LogEntry>(() => idb().logEntries),
    liveAll: () => idb().logEntries.toArray(),
    liveByDate: (date) => idb().logEntries.where("date").equals(date).toArray(),
    liveBySession: (sessionId) =>
      idb().logEntries.where("sessionId").equals(sessionId).toArray(),
    liveByExercise: (exerciseId) =>
      idb().logEntries.where("exerciseId").equals(exerciseId).toArray(),
    upsertForExerciseToday: async (date, exerciseId, patch, sessionId) => {
      await idb().transaction("rw", idb().logEntries, async () => {
        const existing = await idb()
          .logEntries.where("[date+exerciseId]")
          .equals([date, exerciseId])
          .first();
        if (existing) {
          await idb().logEntries.update(existing.id, { ...patch, sessionId });
        } else {
          const entry: LogEntry = {
            id: newId(),
            date,
            exerciseId,
            sessionId,
            completed: patch.completed ?? true,
            ...patch,
          };
          await idb().logEntries.add(entry);
        }
      });
    },
  };

  nmes: NmesRepo = {
    ...makeCrud<NmesSession>(() => idb().nmesSessions),
    liveAllOrdered: () => idb().nmesSessions.orderBy("date").toArray(),
    liveByDate: (date) => idb().nmesSessions.where("date").equals(date).toArray(),
  };

  dailyMetrics: DailyMetricRepo = {
    ...makeCrud<DailyMetric>(() => idb().dailyMetrics),
    liveAllOrdered: () => idb().dailyMetrics.orderBy("date").toArray(),
    getByDate: (date) => idb().dailyMetrics.where("date").equals(date).first(),
    upsertForDate: async (date, patch) => {
      await idb().transaction("rw", idb().dailyMetrics, async () => {
        const existing = await idb().dailyMetrics.where("date").equals(date).first();
        if (existing) {
          await idb().dailyMetrics.update(existing.id, patch);
        } else {
          await idb().dailyMetrics.add({ id: newId(), date, ...patch });
        }
      });
    },
  };

  ptNotes: PtNoteRepo = {
    ...makeCrud<PtNote>(() => idb().ptNotes),
    liveAllOrdered: () => idb().ptNotes.orderBy("date").reverse().toArray(),
  };

  meta: MetaRepo = {
    get: async (key) => (await idb().meta.get(key))?.value,
    set: async (key, value) => {
      await idb().meta.put({ key, value });
    },
  };

  async exportAll(): Promise<BackupBundle> {
    const d = idb();
    const [stages, exercises, sessions, logEntries, nmesSessions, dailyMetrics, ptNotes] =
      await Promise.all([
        d.stages.toArray(),
        d.exercises.toArray(),
        d.sessions.toArray(),
        d.logEntries.toArray(),
        d.nmesSessions.toArray(),
        d.dailyMetrics.toArray(),
        d.ptNotes.toArray(),
      ]);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      stages,
      exercises,
      sessions,
      logEntries,
      nmesSessions,
      dailyMetrics,
      ptNotes,
    };
  }

  async importAll(bundle: BackupBundle): Promise<void> {
    const d = idb();
    await d.transaction(
      "rw",
      [d.stages, d.exercises, d.sessions, d.logEntries, d.nmesSessions, d.dailyMetrics, d.ptNotes, d.meta],
      async () => {
        await Promise.all([
          d.stages.clear(),
          d.exercises.clear(),
          d.sessions.clear(),
          d.logEntries.clear(),
          d.nmesSessions.clear(),
          d.dailyMetrics.clear(),
          d.ptNotes.clear(),
        ]);
        await Promise.all([
          d.stages.bulkPut(bundle.stages ?? []),
          d.exercises.bulkPut(bundle.exercises ?? []),
          d.sessions.bulkPut(bundle.sessions ?? []),
          d.logEntries.bulkPut(bundle.logEntries ?? []),
          d.nmesSessions.bulkPut(bundle.nmesSessions ?? []),
          d.dailyMetrics.bulkPut(bundle.dailyMetrics ?? []),
          d.ptNotes.bulkPut(bundle.ptNotes ?? []),
        ]);
        await d.meta.put({ key: SEEDED_KEY, value: "true" });
      },
    );
  }

  async ensureSeeded(): Promise<void> {
    const seeded = await this.meta.get(SEEDED_KEY);
    if (seeded === "true") return;
    const { stages, exercises } = buildSeedData();
    const d = idb();
    await d.transaction("rw", [d.stages, d.exercises, d.meta], async () => {
      // Guard against a race where another tab seeded first.
      const count = await d.stages.count();
      if (count === 0) {
        await d.stages.bulkPut(stages);
        await d.exercises.bulkPut(exercises);
      }
      await d.meta.put({ key: SEEDED_KEY, value: "true" });
    });
  }

  async resetAndReseed(): Promise<void> {
    const d = idb();
    await d.transaction(
      "rw",
      [d.stages, d.exercises, d.sessions, d.logEntries, d.nmesSessions, d.dailyMetrics, d.ptNotes, d.meta],
      async () => {
        await Promise.all([
          d.stages.clear(),
          d.exercises.clear(),
          d.sessions.clear(),
          d.logEntries.clear(),
          d.nmesSessions.clear(),
          d.dailyMetrics.clear(),
          d.ptNotes.clear(),
          d.meta.clear(),
        ]);
        const { stages, exercises } = buildSeedData();
        await d.stages.bulkPut(stages);
        await d.exercises.bulkPut(exercises);
        await d.meta.put({ key: SEEDED_KEY, value: "true" });
      },
    );
  }
}

// The single swap point for the storage backend.
export const db: AppRepository = new DexieRepository();

// Re-export the default date helper so callers don't reach past the seam for it.
export { today };
