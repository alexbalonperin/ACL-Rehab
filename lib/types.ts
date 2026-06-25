// Domain types for the ACL Rehab Tracker.
// These are storage-agnostic — the repository interface in lib/db.ts is written
// against these types, so swapping Dexie for Supabase later never touches the UI.

export type ExerciseStatus = "upcoming" | "active" | "graduated";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

/** A rehab phase that groups exercises. */
export interface Stage {
  id: string;
  name: string;
  order: number;
  note?: string;
}

export interface Exercise {
  id: string;
  name: string;
  stageId: string;
  status: ExerciseStatus; // active = cleared to do now
  howTo: string[]; // ordered steps
  musclesActivated: string[];
  difficulty: Difficulty;
  sets: number;
  reps: number;
  holdSeconds?: number;
  restBetweenRepsSeconds?: number;
  restBetweenSetsSeconds?: number;
  notes?: string;
  /** Caution shown when an exercise is ambiguous about loading the operated leg. */
  caution?: string;
  order: number;
}

/** A session bundles everything logged in one sitting. */
export interface Session {
  id: string;
  date: string; // YYYY-MM-DD (local)
  startedAt: number; // epoch ms
  endedAt?: number; // epoch ms — unset while active
  notes?: string;
}

/** One record per exercise per day done. */
export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD (local)
  exerciseId: string;
  sessionId?: string | null; // null for unsessioned entries (first-class)
  completed: boolean;
  setsDone?: number;
  repsDone?: number;
  painLevel?: number; // 0–10
  notes?: string;
}

/** NMES / e-stim session, modeled separately from exercises. */
export interface NmesSession {
  id: string;
  date: string; // YYYY-MM-DD (local)
  sessionId?: string | null; // null for unsessioned entries
  device: string;
  program: string;
  targetMuscle: string;
  intensityMa: number; // the key progression metric
  durationMinutes: number;
  painLevel?: number; // 0–10
  notes?: string;
}

/** Daily knee signals, one record per day. */
export interface DailyMetric {
  id: string;
  date: string; // YYYY-MM-DD (local), unique per day
  romFlexionDeg?: number;
  romExtensionDeg?: number;
  swellingOperatedCm?: number;
  swellingOtherCm?: number;
  overallPain?: number; // 0–10, distinct from per-exercise pain
  notes?: string;
}

/** A log of PT / surgeon visits and clearance changes. */
export interface PtNote {
  id: string;
  date: string; // YYYY-MM-DD (local)
  title?: string;
  body: string;
  clearanceChange?: boolean;
}

export interface BackupBundle {
  version: number;
  exportedAt: string; // ISO timestamp
  stages: Stage[];
  exercises: Exercise[];
  sessions: Session[];
  logEntries: LogEntry[];
  nmesSessions: NmesSession[];
  dailyMetrics: DailyMetric[];
  ptNotes: PtNote[];
}

export const NMES_DEVICE_DEFAULT = "Globus Genesy 300 Pro";
export const NMES_TARGET_DEFAULT = "Quad — operated leg";
