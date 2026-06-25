"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { addDays, parseLocalDate, shortLabel, today } from "@/lib/date";

const WEEKS = 18; // ~4 months shown

export function CalendarHeatmap({ activeDates }: { activeDates: string[] }) {
  const set = useMemo(() => new Set(activeDates), [activeDates]);

  const { columns, monthLabels } = useMemo(() => {
    const end = today();
    // Align the grid so the last column ends today; walk back WEEKS*7 days.
    const start = addDays(end, -(WEEKS * 7 - 1));
    // Shift start back to the Monday of its week.
    const startDow = (parseLocalDate(start).getDay() + 6) % 7;
    const gridStart = addDays(start, -startDow);

    const cols: string[][] = [];
    const labels: { col: number; text: string }[] = [];
    let cursor = gridStart;
    let lastMonth = -1;
    for (let w = 0; w < WEEKS + 1; w++) {
      const col: string[] = [];
      for (let d = 0; d < 7; d++) {
        col.push(cursor);
        const m = parseLocalDate(cursor).getMonth();
        if (d === 0 && m !== lastMonth) {
          labels.push({ col: w, text: parseLocalDate(cursor).toLocaleDateString(undefined, { month: "short" }) });
          lastMonth = m;
        }
        cursor = addDays(cursor, 1);
      }
      cols.push(col);
    }
    return { columns: cols, monthLabels: labels };
  }, []);

  const todayStr = today();

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-1 pl-0 text-[10px] text-neutral-400">
          {columns.map((_, i) => {
            const lab = monthLabels.find((m) => m.col === i);
            return (
              <div key={i} className="w-3.5 shrink-0">
                {lab?.text ?? ""}
              </div>
            );
          })}
        </div>
        <div className="flex gap-1">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((date) => {
                const isFuture = date > todayStr;
                const active = set.has(date);
                return (
                  <div
                    key={date}
                    title={`${shortLabel(date)}${active ? " · logged" : ""}`}
                    className={clsx(
                      "h-3.5 w-3.5 rounded-sm",
                      isFuture
                        ? "bg-transparent"
                        : active
                          ? "bg-brand"
                          : "bg-neutral-200 dark:bg-neutral-800",
                      date === todayStr && "ring-2 ring-brand/50",
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
