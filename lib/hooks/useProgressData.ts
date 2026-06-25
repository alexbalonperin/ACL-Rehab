"use client";

import { useMemo } from "react";
import {
  useAllDailyMetrics,
  useAllLogs,
  useAllNmes,
  useAllSessions,
  useExercises,
} from "./useData";
import type { Exercise, LogEntry, NmesSession, Session } from "../types";
import { addDays, today, weekKey } from "../date";

export interface ExerciseHistory {
  exerciseId: string;
  name: string;
  firstDone?: string;
  lastDone?: string;
  timesDone: number;
  totalVolume: number; // sum of setsDone*repsDone (falls back to planned)
}

export interface ProgressData {
  loading: boolean;
  /** Distinct dates with any logged activity (logs, nmes, sessions, metrics). */
  activeDates: string[];
  activeDaysCount: number;
  currentStreak: number;
  completedSessions: number;
  // Series keyed for charts:
  sessionsPerWeek: { week: string; sessions: number }[];
  nmesPerWeek: { week: string; count: number }[];
  painTrend: { date: string; pain: number }[];
  volumeTrend: { date: string; volume: number }[];
  avgSessionDuration: { date: string; minutes: number }[];
  nmesIntensity: { date: string; mA: number }[];
  romTrend: { date: string; flexion?: number; extension?: number }[];
  swellingTrend: { date: string; operated?: number; other?: number }[];
  dailyPainTrend: { date: string; pain: number }[];
  perExercise: ExerciseHistory[];
}

const EMPTY: ProgressData = {
  loading: true,
  activeDates: [],
  activeDaysCount: 0,
  currentStreak: 0,
  completedSessions: 0,
  sessionsPerWeek: [],
  nmesPerWeek: [],
  painTrend: [],
  volumeTrend: [],
  avgSessionDuration: [],
  nmesIntensity: [],
  romTrend: [],
  swellingTrend: [],
  dailyPainTrend: [],
  perExercise: [],
};

function computeStreak(activeSet: Set<string>): number {
  let streak = 0;
  let cursor = today();
  // Allow the streak to "start" yesterday if nothing logged yet today.
  if (!activeSet.has(cursor)) cursor = addDays(cursor, -1);
  while (activeSet.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function useProgressData(): ProgressData {
  const logs = useAllLogs();
  const nmes = useAllNmes();
  const sessions = useAllSessions();
  const exercises = useExercises();
  const metrics = useAllDailyMetrics();

  return useMemo<ProgressData>(() => {
    if (!logs || !nmes || !sessions || !exercises || !metrics) return EMPTY;

    const exById = new Map<string, Exercise>(exercises.map((e) => [e.id, e]));

    // ── Active dates across every kind of activity ──
    const activeSet = new Set<string>();
    logs.forEach((l: LogEntry) => activeSet.add(l.date));
    nmes.forEach((n: NmesSession) => activeSet.add(n.date));
    sessions.forEach((s: Session) => activeSet.add(s.date));
    metrics.forEach((m) => activeSet.add(m.date));
    const activeDates = [...activeSet].sort();

    // ── Sessions per week (completed Session entities) ──
    const completed = sessions.filter((s) => s.endedAt != null);
    const sessWeek = new Map<string, number>();
    completed.forEach((s) => sessWeek.set(weekKey(s.date), (sessWeek.get(weekKey(s.date)) ?? 0) + 1));
    const sessionsPerWeek = [...sessWeek.entries()]
      .sort()
      .map(([week, n]) => ({ week, sessions: n }));

    // ── NMES per week + intensity over time ──
    const nmesWeek = new Map<string, number>();
    nmes.forEach((n) => nmesWeek.set(weekKey(n.date), (nmesWeek.get(weekKey(n.date)) ?? 0) + 1));
    const nmesPerWeek = [...nmesWeek.entries()].sort().map(([week, n]) => ({ week, count: n }));
    const nmesIntensity = [...nmes]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((n) => ({ date: n.date, mA: n.intensityMa }));

    // ── Pain trend (per-day average across log entries that recorded pain) ──
    const painByDate = new Map<string, number[]>();
    logs.forEach((l) => {
      if (typeof l.painLevel === "number") {
        const arr = painByDate.get(l.date) ?? [];
        arr.push(l.painLevel);
        painByDate.set(l.date, arr);
      }
    });
    const painTrend = [...painByDate.entries()]
      .sort()
      .map(([date, arr]) => ({ date, pain: arr.reduce((a, b) => a + b, 0) / arr.length }));

    // ── Volume trend (sets*reps per day) ──
    const volByDate = new Map<string, number>();
    logs.forEach((l) => {
      if (!l.completed) return;
      const ex = exById.get(l.exerciseId);
      const sets = l.setsDone ?? ex?.sets ?? 0;
      const reps = l.repsDone ?? ex?.reps ?? 0;
      volByDate.set(l.date, (volByDate.get(l.date) ?? 0) + sets * reps);
    });
    const volumeTrend = [...volByDate.entries()].sort().map(([date, volume]) => ({ date, volume }));

    // ── Average session duration over time (by date) ──
    const durByDate = new Map<string, number[]>();
    completed.forEach((s) => {
      const mins = ((s.endedAt as number) - s.startedAt) / 60000;
      const arr = durByDate.get(s.date) ?? [];
      arr.push(mins);
      durByDate.set(s.date, arr);
    });
    const avgSessionDuration = [...durByDate.entries()].sort().map(([date, arr]) => ({
      date,
      minutes: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10,
    }));

    // ── Daily metric trends ──
    const sortedMetrics = [...metrics].sort((a, b) => a.date.localeCompare(b.date));
    const romTrend = sortedMetrics
      .filter((m) => m.romFlexionDeg != null || m.romExtensionDeg != null)
      .map((m) => ({ date: m.date, flexion: m.romFlexionDeg, extension: m.romExtensionDeg }));
    const swellingTrend = sortedMetrics
      .filter((m) => m.swellingOperatedCm != null || m.swellingOtherCm != null)
      .map((m) => ({ date: m.date, operated: m.swellingOperatedCm, other: m.swellingOtherCm }));
    const dailyPainTrend = sortedMetrics
      .filter((m) => m.overallPain != null)
      .map((m) => ({ date: m.date, pain: m.overallPain as number }));

    // ── Per-exercise history ──
    const histMap = new Map<string, ExerciseHistory>();
    logs.forEach((l) => {
      if (!l.completed) return;
      const ex = exById.get(l.exerciseId);
      const h =
        histMap.get(l.exerciseId) ??
        ({
          exerciseId: l.exerciseId,
          name: ex?.name ?? "(deleted exercise)",
          timesDone: 0,
          totalVolume: 0,
        } as ExerciseHistory);
      h.timesDone += 1;
      h.totalVolume += (l.setsDone ?? ex?.sets ?? 0) * (l.repsDone ?? ex?.reps ?? 0);
      h.firstDone = h.firstDone ? (l.date < h.firstDone ? l.date : h.firstDone) : l.date;
      h.lastDone = h.lastDone ? (l.date > h.lastDone ? l.date : h.lastDone) : l.date;
      histMap.set(l.exerciseId, h);
    });
    const perExercise = [...histMap.values()].sort((a, b) => b.timesDone - a.timesDone);

    return {
      loading: false,
      activeDates,
      activeDaysCount: activeDates.length,
      currentStreak: computeStreak(activeSet),
      completedSessions: completed.length,
      sessionsPerWeek,
      nmesPerWeek,
      painTrend,
      volumeTrend,
      avgSessionDuration,
      nmesIntensity,
      romTrend,
      swellingTrend,
      dailyPainTrend,
      perExercise,
    };
  }, [logs, nmes, sessions, exercises, metrics]);
}
