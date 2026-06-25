"use client";

import { useMemo } from "react";
import {
  useAllDailyMetrics,
  useAllLogs,
  useAllNmes,
  useAllSessions,
  useExercises,
  useStages,
  useSurgeryDate,
} from "./useData";
import type { Exercise, Stage } from "../types";
import { addDays, daysBetween, today } from "../date";

export interface TimelineWeek {
  weekNumber: number; // 1-based post-op week (week 1 = post-op days 0–6)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (startDate + 6)
  isCurrent: boolean;
  isPast: boolean;
  isFuture: boolean;
  stages: Stage[]; // phases scheduled to overlap this week
  exercises: Exercise[]; // exercises in those phases, ordered by stage then exercise order
  loggedDays: number; // distinct dates with any logged activity in the week
  completedCount: number; // distinct exercises with a completed log in the week
}

export interface TimelineData {
  loading: boolean;
  surgeryDate: string;
  currentWeek: number; // 1-based; <= 0 if today is before surgery
  weeks: TimelineWeek[];
  unscheduledStages: Stage[]; // stages with no week range
}

const HARD_WEEK_CAP = 104; // 2 years — guards against a mis-entered far-past date

function emptyData(surgeryDate: string): TimelineData {
  return {
    loading: true,
    surgeryDate,
    currentWeek: 0,
    weeks: [],
    unscheduledStages: [],
  };
}

/** 1-based post-op week index for a date, relative to the surgery date. */
function weekIndexOf(surgeryDate: string, date: string): number {
  return Math.floor(daysBetween(surgeryDate, date) / 7) + 1;
}

export function useTimelineData(): TimelineData {
  const surgeryDate = useSurgeryDate();
  const stages = useStages();
  const exercises = useExercises();
  const logs = useAllLogs();
  const sessions = useAllSessions();
  const nmes = useAllNmes();
  const metrics = useAllDailyMetrics();

  return useMemo<TimelineData>(() => {
    if (!stages || !exercises || !logs || !sessions || !nmes || !metrics) {
      return emptyData(surgeryDate);
    }

    const currentWeek = weekIndexOf(surgeryDate, today());

    // Exercises grouped by stage, pre-sorted by exercise order.
    const exByStage = new Map<string, Exercise[]>();
    [...exercises]
      .sort((a, b) => a.order - b.order)
      .forEach((e) => {
        const arr = exByStage.get(e.stageId) ?? [];
        arr.push(e);
        exByStage.set(e.stageId, arr);
      });

    const scheduled = [...stages]
      .filter((s) => s.startWeekPostOp != null)
      .sort((a, b) => a.order - b.order);
    const unscheduledStages = [...stages]
      .filter((s) => s.startWeekPostOp == null)
      .sort((a, b) => a.order - b.order);

    // How many weeks to render: enough to cover the schedule, the current week,
    // and a small look-ahead — capped to avoid pathological rendering.
    let lastScheduledWeek = 0;
    scheduled.forEach((s) => {
      const end = s.endWeekPostOp ?? (s.startWeekPostOp as number) + 4; // open-ended buffer
      lastScheduledWeek = Math.max(lastScheduledWeek, end);
    });
    const weekCount = Math.min(
      Math.max(currentWeek + 2, lastScheduledWeek, 12, 1),
      HARD_WEEK_CAP,
    );

    // Pre-bucket activity by post-op week index (single pass over each source).
    const activeDatesByWeek = new Map<number, Set<string>>();
    const completedExByWeek = new Map<number, Set<string>>();
    const addActiveDate = (date: string) => {
      const w = weekIndexOf(surgeryDate, date);
      const set = activeDatesByWeek.get(w) ?? new Set<string>();
      set.add(date);
      activeDatesByWeek.set(w, set);
    };
    logs.forEach((l) => {
      addActiveDate(l.date);
      if (l.completed) {
        const w = weekIndexOf(surgeryDate, l.date);
        const set = completedExByWeek.get(w) ?? new Set<string>();
        set.add(l.exerciseId);
        completedExByWeek.set(w, set);
      }
    });
    sessions.forEach((s) => addActiveDate(s.date));
    nmes.forEach((n) => addActiveDate(n.date));
    metrics.forEach((m) => addActiveDate(m.date));

    const weeks: TimelineWeek[] = [];
    for (let weekNumber = 1; weekNumber <= weekCount; weekNumber++) {
      const startDate = addDays(surgeryDate, (weekNumber - 1) * 7);
      const endDate = addDays(startDate, 6);

      const weekStages = scheduled.filter(
        (s) =>
          weekNumber >= (s.startWeekPostOp as number) &&
          (s.endWeekPostOp == null || weekNumber <= s.endWeekPostOp),
      );
      const weekExercises = weekStages.flatMap((s) => exByStage.get(s.id) ?? []);

      weeks.push({
        weekNumber,
        startDate,
        endDate,
        isCurrent: weekNumber === currentWeek,
        isPast: weekNumber < currentWeek,
        isFuture: weekNumber > currentWeek,
        stages: weekStages,
        exercises: weekExercises,
        loggedDays: activeDatesByWeek.get(weekNumber)?.size ?? 0,
        completedCount: completedExByWeek.get(weekNumber)?.size ?? 0,
      });
    }

    return {
      loading: false,
      surgeryDate,
      currentWeek,
      weeks,
      unscheduledStages,
    };
  }, [surgeryDate, stages, exercises, logs, sessions, nmes, metrics]);
}
