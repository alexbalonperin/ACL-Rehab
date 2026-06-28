"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import type { ExerciseStatus } from "../types";
import {
  GRAFT_TYPE_KEY,
  SURGERY_DATE_KEY,
  TARGET_SPORT_KEY,
} from "../types";
import { today } from "../date";
import { resolveSettings, type RehabSettings } from "../rehab";

// Each hook subscribes via useLiveQuery but only ever calls repository methods,
// so all data access stays behind the lib/db.ts seam.

export function useStages() {
  return useLiveQuery(() => db.stages.liveAllOrdered(), [], undefined);
}

export function useExercises() {
  return useLiveQuery(() => db.exercises.liveAll(), [], undefined);
}

export function useExercisesByStatus(status: ExerciseStatus) {
  return useLiveQuery(() => db.exercises.liveByStatus(status), [status], undefined);
}

export function useActiveSession() {
  return useLiveQuery(() => db.sessions.liveActive(), [], undefined);
}

export function useTodayLog(date: string = today()) {
  return useLiveQuery(() => db.logs.liveByDate(date), [date], undefined);
}

export function useAllLogs() {
  return useLiveQuery(() => db.logs.liveAll(), [], undefined);
}

export function useTodayNmes(date: string = today()) {
  return useLiveQuery(() => db.nmes.liveByDate(date), [date], undefined);
}

export function useAllNmes() {
  return useLiveQuery(() => db.nmes.liveAllOrdered(), [], undefined);
}

export function useAllSessions() {
  return useLiveQuery(() => db.sessions.liveAllOrdered(), [], undefined);
}

export function useDailyMetric(date: string = today()) {
  return useLiveQuery(() => db.dailyMetrics.getByDate(date), [date], undefined);
}

export function useAllDailyMetrics() {
  return useLiveQuery(() => db.dailyMetrics.liveAllOrdered(), [], undefined);
}

export function usePtNotes() {
  return useLiveQuery(() => db.ptNotes.liveAllOrdered(), [], undefined);
}

/** Live rehab settings (surgery date, graft type, target sport). */
export function useRehabSettings(): RehabSettings | undefined {
  return useLiveQuery(async () => {
    const [surgeryDate, graftType, targetSport] = await Promise.all([
      db.meta.get(SURGERY_DATE_KEY),
      db.meta.get(GRAFT_TYPE_KEY),
      db.meta.get(TARGET_SPORT_KEY),
    ]);
    return resolveSettings({
      [SURGERY_DATE_KEY]: surgeryDate,
      [GRAFT_TYPE_KEY]: graftType,
      [TARGET_SPORT_KEY]: targetSport,
    });
  }, [], undefined);
}
