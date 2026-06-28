// ─────────────────────────────────────────────────────────────────────────────
// THE DATA SEAM.
//
// This is the ONLY module in the app that knows about Dexie/IndexedDB. Every
// component and hook imports the `db` singleton and talks to the typed
// `AppRepository` interface below. To migrate to Supabase later, write a
// `SupabaseRepository implements AppRepository` and change the single
// `export const db = ...` line at the bottom. No UI changes required.
// ─────────────────────────────────────────────────────────────────────────────

import Dexie, { type Table, type Transaction, type UpdateSpec } from "dexie";
import type {
  BackupBundle,
  DailyMetric,
  Exercise,
  ExerciseStatus,
  LogEntry,
  NmesSession,
  PhaseCriterion,
  PtNote,
  Session,
  Stage,
} from "./types";
import {
  DEFAULT_GRAFT_TYPE,
  DEFAULT_SURGERY_DATE,
  DEFAULT_TARGET_SPORT,
  GRAFT_TYPE_KEY,
  SURGERY_DATE_KEY,
  TARGET_SPORT_KEY,
} from "./types";
import { newId } from "./id";
import { today } from "./date";
import { buildSeedData } from "./seed";
import {
  buildCriteria,
  CLINICAL_PHASES,
  effectiveHardGateDate,
  V1_PHASE_KEYS,
} from "./rehab";

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
  /** Toggle / annotate a single gating criterion, stamping updatedAt. */
  setCriterion(
    stageId: string,
    criterionId: string,
    patch: { checked?: boolean; note?: string },
  ): Promise<void>;
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
    const STORES = {
      stages: "id, order, phaseKey",
      exercises: "id, stageId, status, order, [stageId+order], [status+order]",
      sessions: "id, date, startedAt, endedAt",
      logEntries: "id, date, exerciseId, sessionId, [date+exerciseId]",
      nmesSessions: "id, date, sessionId",
      dailyMetrics: "id, date",
      ptNotes: "id, date",
      meta: "key",
    };
    // v1: original schema (kept verbatim so existing DBs are recognised).
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
    // v2: clinical detail layered onto phases. Indexes phaseKey and migrates
    // existing data in place — no records are deleted or reset.
    this.version(2)
      .stores(STORES)
      .upgrade((tx) => migrateToV2(tx));
  }
}

/**
 * v2 upgrade: enrich existing phases (Stage records) with goals, gating exit
 * criteria, post-op time windows and the return-to-sport hard gate, and insert
 * any clinical phases that the original 4-phase seed didn't include — all
 * without touching exercises, logs, metrics or notes.
 */
async function migrateToV2(tx: Transaction) {
  const stagesTbl = tx.table<Stage, string>("stages");
  const metaTbl = tx.table<MetaRow, string>("meta");

  // Seed settings if absent (fresh-but-pre-v2 installs won't have them).
  const surgeryDate = (await metaTbl.get(SURGERY_DATE_KEY))?.value ?? DEFAULT_SURGERY_DATE;
  await putIfMissing(metaTbl, SURGERY_DATE_KEY, DEFAULT_SURGERY_DATE);
  await putIfMissing(metaTbl, GRAFT_TYPE_KEY, DEFAULT_GRAFT_TYPE);
  await putIfMissing(metaTbl, TARGET_SPORT_KEY, DEFAULT_TARGET_SPORT);

  const existing = (await stagesTbl.toArray()).sort((a, b) => a.order - b.order);

  const patchFromBlueprint = (phaseKey: string): Partial<Stage> => {
    const bp = CLINICAL_PHASES.find((p) => p.phaseKey === phaseKey)!;
    const patch: Partial<Stage> = {
      phaseKey: bp.phaseKey,
      goals: bp.goals,
      gatingCriteria: buildCriteria(bp.criteria, newId),
      minWeekPostOp: bp.minWeekPostOp,
      maxWeekPostOp: bp.maxWeekPostOp,
    };
    if (bp.hardGate) {
      patch.hardGate = true;
      patch.hardGateDate = effectiveHardGateDate(bp, surgeryDate);
    }
    return patch;
  };

  const newStageFromBlueprint = (phaseKey: string, order: number): Stage => {
    const bp = CLINICAL_PHASES.find((p) => p.phaseKey === phaseKey)!;
    return { id: newId(), name: bp.name, order, note: bp.note, ...patchFromBlueprint(phaseKey) };
  };

  const alreadyEnriched = existing.some((s) => s.phaseKey);
  if (alreadyEnriched) return; // idempotent: nothing to do.

  if (existing.length === V1_PHASE_KEYS.length) {
    // Clean default path: the original 4 seeded phases map by position to
    // early-recovery / foundation / strength / return-to-sport. The two
    // mid-rehab phases (running-plyo, agility) are inserted between strength
    // and return-to-sport. Existing names/notes are preserved.
    const finalOrder = [0, 1, 2, 5]; // strength keeps 2; RTS moves to 5.
    for (let i = 0; i < existing.length; i++) {
      const phaseKey = V1_PHASE_KEYS[i];
      await stagesTbl.update(existing[i].id, {
        ...patchFromBlueprint(phaseKey),
        order: finalOrder[i],
      });
    }
    await stagesTbl.add(newStageFromBlueprint("running-plyo", 3));
    await stagesTbl.add(newStageFromBlueprint("agility", 4));
  } else {
    // Customised data: don't reshuffle. Append any clinical phases that aren't
    // present yet so the full structure exists, and best-effort enrich phases
    // whose name still matches a known default.
    let nextOrder = existing.reduce((m, s) => Math.max(m, s.order), -1) + 1;
    for (const bp of CLINICAL_PHASES) {
      await stagesTbl.add(newStageFromBlueprint(bp.phaseKey, nextOrder++));
    }
  }
}

async function putIfMissing(table: Table<MetaRow, string>, key: string, value: string) {
  if (!(await table.get(key))) await table.put({ key, value });
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
    setCriterion: async (stageId, criterionId, patch) => {
      await idb().transaction("rw", idb().stages, async () => {
        const stage = await idb().stages.get(stageId);
        if (!stage?.gatingCriteria) return;
        const next: PhaseCriterion[] = stage.gatingCriteria.map((c) =>
          c.id === criterionId
            ? {
                ...c,
                ...(patch.checked !== undefined ? { checked: patch.checked } : {}),
                ...(patch.note !== undefined ? { note: patch.note } : {}),
                updatedAt: Date.now(),
              }
            : c,
        );
        await idb().stages.update(stageId, { gatingCriteria: next });
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
    const [stages, exercises, sessions, logEntries, nmesSessions, dailyMetrics, ptNotes, meta] =
      await Promise.all([
        d.stages.toArray(),
        d.exercises.toArray(),
        d.sessions.toArray(),
        d.logEntries.toArray(),
        d.nmesSessions.toArray(),
        d.dailyMetrics.toArray(),
        d.ptNotes.toArray(),
        d.meta.toArray(),
      ]);
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      stages,
      exercises,
      sessions,
      logEntries,
      nmesSessions,
      dailyMetrics,
      ptNotes,
      meta,
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
          // Restore settings (surgery date, graft, sport) if the backup has them.
          d.meta.bulkPut(bundle.meta ?? []),
        ]);
        await d.meta.put({ key: SEEDED_KEY, value: "true" });
      },
    );
  }

  async ensureSeeded(): Promise<void> {
    const seeded = await this.meta.get(SEEDED_KEY);
    if (seeded === "true") return;
    const { stages, exercises } = buildSeedData(DEFAULT_SURGERY_DATE);
    const d = idb();
    await d.transaction("rw", [d.stages, d.exercises, d.meta], async () => {
      // Guard against a race where another tab seeded first.
      const count = await d.stages.count();
      if (count === 0) {
        await d.stages.bulkPut(stages);
        await d.exercises.bulkPut(exercises);
      }
      await putIfMissing(d.meta, SURGERY_DATE_KEY, DEFAULT_SURGERY_DATE);
      await putIfMissing(d.meta, GRAFT_TYPE_KEY, DEFAULT_GRAFT_TYPE);
      await putIfMissing(d.meta, TARGET_SPORT_KEY, DEFAULT_TARGET_SPORT);
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
        const { stages, exercises } = buildSeedData(DEFAULT_SURGERY_DATE);
        await d.stages.bulkPut(stages);
        await d.exercises.bulkPut(exercises);
        await d.meta.put({ key: SURGERY_DATE_KEY, value: DEFAULT_SURGERY_DATE });
        await d.meta.put({ key: GRAFT_TYPE_KEY, value: DEFAULT_GRAFT_TYPE });
        await d.meta.put({ key: TARGET_SPORT_KEY, value: DEFAULT_TARGET_SPORT });
        await d.meta.put({ key: SEEDED_KEY, value: "true" });
      },
    );
  }
}

// The single swap point for the storage backend.
export const db: AppRepository = new DexieRepository();

// Re-export the default date helper so callers don't reach past the seam for it.
export { today };
