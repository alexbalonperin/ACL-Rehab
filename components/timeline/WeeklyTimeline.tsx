"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import type { Exercise, Stage } from "@/lib/types";
import { daysBetween, parseLocalDate, shortLabel, today } from "@/lib/date";
import { useTimelineData, type TimelineWeek } from "@/lib/hooks/useTimelineData";
import { Card, Chip } from "@/components/ui/primitives";
import { DifficultyDots, ExerciseDetails, summaryLine } from "@/components/exercise/format";

function fullDate(s: string): string {
  return parseLocalDate(s).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_LABEL: Record<Exercise["status"], string> = {
  active: "cleared",
  upcoming: "upcoming",
  graduated: "graduated",
};

function TimelineExerciseRow({ ex }: { ex: Exercise }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800">
      <button className="w-full text-left" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{ex.name}</span>
          <Chip tone={ex.status === "active" ? "brand" : "neutral"}>
            {STATUS_LABEL[ex.status]}
          </Chip>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
          <DifficultyDots value={ex.difficulty} />
          <span>{summaryLine(ex)}</span>
          {ex.caution && <span title="Caution">⚠️</span>}
        </div>
      </button>
      {open && <ExerciseDetails ex={ex} />}
    </div>
  );
}

function WeekCard({
  week,
  cardRef,
}: {
  week: TimelineWeek;
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div ref={cardRef}>
      <Card className={clsx(week.isCurrent && "ring-2 ring-brand")}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold">Week {week.weekNumber}</p>
            <p className="text-xs text-neutral-500">
              {shortLabel(week.startDate)} – {shortLabel(week.endDate)}
            </p>
          </div>
          {week.isCurrent ? (
            <Chip tone="brand">This week</Chip>
          ) : week.isPast ? (
            <Chip tone="neutral">Done</Chip>
          ) : (
            <Chip tone="neutral">Upcoming</Chip>
          )}
        </div>

        {week.stages.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {week.stages.map((s) => (
              <Chip key={s.id}>{s.name}</Chip>
            ))}
          </div>
        )}

        {!week.isFuture && (
          <p className="mt-2 text-xs text-neutral-500">
            {week.loggedDays}/7 days logged · {week.completedCount} exercise
            {week.completedCount === 1 ? "" : "s"} completed
          </p>
        )}

        <div className="mt-3 space-y-1.5">
          {week.stages.length === 0 ? (
            <p className="text-sm text-neutral-500">No phase scheduled for this week.</p>
          ) : week.exercises.length === 0 ? (
            <p className="text-sm text-neutral-500">No exercises in this phase yet.</p>
          ) : (
            week.exercises.map((ex) => <TimelineExerciseRow key={ex.id} ex={ex} />)
          )}
        </div>
      </Card>
    </div>
  );
}

function UnscheduledSection({ stages }: { stages: Stage[] }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
        Not on the week schedule
      </h2>
      <p className="mb-3 text-xs text-neutral-500">
        Set a week range for these phases in Manage to place them on the timeline.
      </p>
      <div className="space-y-2">
        {stages.map((s) => (
          <Card key={s.id}>
            <p className="font-bold">{s.name}</p>
            {s.note && <p className="text-xs text-neutral-500">{s.note}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function WeeklyTimeline() {
  const { loading, surgeryDate, currentWeek, weeks, unscheduledStages } = useTimelineData();
  const currentRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  // Auto-scroll to the current week (or week 1 when pre-surgery) once after load.
  useEffect(() => {
    if (loading || scrolledRef.current) return;
    if (currentRef.current) {
      currentRef.current.scrollIntoView({ block: "center" });
      scrolledRef.current = true;
    }
  }, [loading, weeks]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900"
          />
        ))}
      </div>
    );
  }

  const daysPostOp = daysBetween(surgeryDate, today());
  const preSurgery = currentWeek <= 0;
  // The week to scroll to / highlight: current week, or week 1 before surgery.
  const scrollWeek = preSurgery ? 1 : currentWeek;

  return (
    <div>
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Surgery date
            </p>
            <p className="text-lg font-bold">{fullDate(surgeryDate)}</p>
            <p className="text-xs text-neutral-500">
              {preSurgery
                ? `In ${-daysPostOp} day${-daysPostOp === 1 ? "" : "s"}`
                : `Day ${daysPostOp} · Week ${currentWeek}`}
            </p>
          </div>
          <Link
            href="/manage"
            className="text-xs font-medium text-brand underline-offset-2 hover:underline"
          >
            Edit in Manage
          </Link>
        </div>
      </Card>

      {preSurgery && (
        <Card className="mb-4 border-brand/40 bg-teal-50 dark:bg-teal-950/30">
          <p className="text-sm text-neutral-700 dark:text-neutral-200">
            Surgery is in {-daysPostOp} day{-daysPostOp === 1 ? "" : "s"} — your week-by-week
            plan starts then.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {weeks.map((week) => (
          <WeekCard
            key={week.weekNumber}
            week={week}
            cardRef={week.weekNumber === scrollWeek ? currentRef : undefined}
          />
        ))}
      </div>

      {unscheduledStages.length > 0 && <UnscheduledSection stages={unscheduledStages} />}
    </div>
  );
}
