"use client";

import { useProgressData } from "@/lib/hooks/useProgressData";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { shortLabel } from "@/lib/date";
import { CalendarHeatmap } from "./CalendarHeatmap";
import {
  ChartCard,
  DateAreaChart,
  DateLineChart,
  MultiLineChart,
  WeekBarChart,
} from "./charts";

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <Card className="text-center">
      <div className="text-2xl font-extrabold text-brand">{value}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{label}</div>
    </Card>
  );
}

export function ProgressView() {
  const p = useProgressData();

  if (p.loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Headline stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat value={`${p.currentStreak}🔥`} label="Day streak" />
        <Stat value={p.completedSessions} label="Sessions" />
        <Stat value={p.activeDaysCount} label="Active days" />
      </div>

      <SectionTitle>Activity</SectionTitle>
      <Card>
        <p className="mb-3 text-xs text-neutral-500">Days you logged anything</p>
        <CalendarHeatmap activeDates={p.activeDates} />
      </Card>

      {/* NMES intensity — the prominent, top progress signal */}
      <SectionTitle>NMES — quad reactivation</SectionTitle>
      <ChartCard
        title="NMES intensity (mA) over time"
        subtitle="Rising tolerated mA is a key quad-reactivation signal"
        prominent
        empty={p.nmesIntensity.length === 0}
      >
        <DateLineChart data={p.nmesIntensity} dataKey="mA" color="#0d9488" />
      </ChartCard>
      <ChartCard title="NMES sessions / week" empty={p.nmesPerWeek.length === 0}>
        <WeekBarChart data={p.nmesPerWeek} dataKey="count" color="#14b8a6" />
      </ChartCard>

      <SectionTitle>Training</SectionTitle>
      <ChartCard title="Sessions / week" empty={p.sessionsPerWeek.length === 0}>
        <WeekBarChart data={p.sessionsPerWeek} dataKey="sessions" />
      </ChartCard>
      <ChartCard title="Total volume (sets × reps) over time" empty={p.volumeTrend.length === 0}>
        <DateAreaChart data={p.volumeTrend} dataKey="volume" />
      </ChartCard>
      <ChartCard
        title="Average session duration (min)"
        empty={p.avgSessionDuration.length === 0}
      >
        <DateLineChart data={p.avgSessionDuration} dataKey="minutes" color="#6366f1" />
      </ChartCard>
      <ChartCard title="Pain during exercises (avg / day)" empty={p.painTrend.length === 0}>
        <DateLineChart data={p.painTrend} dataKey="pain" color="#ef4444" domain={[0, 10]} />
      </ChartCard>

      <SectionTitle>Knee metrics</SectionTitle>
      <ChartCard title="Range of motion (°)" empty={p.romTrend.length === 0}>
        <MultiLineChart
          data={p.romTrend}
          series={[
            { key: "flexion", color: "#0d9488", name: "Flexion" },
            { key: "extension", color: "#f59e0b", name: "Extension" },
          ]}
        />
      </ChartCard>
      <ChartCard title="Swelling / girth (cm)" empty={p.swellingTrend.length === 0}>
        <MultiLineChart
          data={p.swellingTrend}
          series={[
            { key: "operated", color: "#ef4444", name: "Operated" },
            { key: "other", color: "#3b82f6", name: "Other" },
          ]}
        />
      </ChartCard>
      <ChartCard title="Daily overall pain" empty={p.dailyPainTrend.length === 0}>
        <DateLineChart data={p.dailyPainTrend} dataKey="pain" color="#ef4444" domain={[0, 10]} />
      </ChartCard>

      <SectionTitle>Per-exercise history</SectionTitle>
      {p.perExercise.length === 0 ? (
        <Card>
          <p className="py-4 text-center text-sm text-neutral-400">
            Complete some exercises to build your history.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {p.perExercise.map((h) => (
            <div key={h.exerciseId} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate font-semibold">{h.name}</p>
                <p className="text-xs text-neutral-500">
                  {h.timesDone}× · vol {h.totalVolume.toLocaleString()}
                  {h.firstDone && ` · since ${shortLabel(h.firstDone)}`}
                </p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
