"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { today } from "@/lib/date";
import { useDailyMetric } from "@/lib/hooks/useData";
import type { DailyMetric } from "@/lib/types";
import { Card, Field, NumberStepper } from "@/components/ui/primitives";

export function DailyCheckin() {
  const metric = useDailyMetric();
  const [open, setOpen] = useState(false);

  const upsert = (patch: Partial<DailyMetric>) =>
    db.dailyMetrics.upsertForDate(today(), patch);

  const summary: string[] = [];
  if (metric?.romFlexionDeg != null) summary.push(`Flex ${metric.romFlexionDeg}°`);
  if (metric?.romExtensionDeg != null) summary.push(`Ext ${metric.romExtensionDeg}°`);
  if (metric?.overallPain != null) summary.push(`Pain ${metric.overallPain}/10`);

  return (
    <Card>
      <button className="flex w-full items-center justify-between" onClick={() => setOpen((v) => !v)}>
        <div className="text-left">
          <h3 className="font-bold">Daily knee check-in</h3>
          <p className="text-xs text-neutral-500">
            {summary.length ? summary.join(" · ") : "ROM, swelling, overall pain"}
          </p>
        </div>
        <span className="text-neutral-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="ROM flexion (°)">
              <NumberStepper
                value={metric?.romFlexionDeg}
                onChange={(v) => upsert({ romFlexionDeg: v })}
                max={160}
              />
            </Field>
            <Field label="ROM extension (°)">
              <NumberStepper
                value={metric?.romExtensionDeg}
                onChange={(v) => upsert({ romExtensionDeg: v })}
                min={-20}
                max={30}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Swelling — operated (cm)" hint="knee girth">
              <NumberStepper
                value={metric?.swellingOperatedCm}
                onChange={(v) => upsert({ swellingOperatedCm: v })}
                max={80}
              />
            </Field>
            <Field label="Swelling — other (cm)">
              <NumberStepper
                value={metric?.swellingOtherCm}
                onChange={(v) => upsert({ swellingOtherCm: v })}
                max={80}
              />
            </Field>
          </div>
          <Field label="Overall knee pain today (0–10)">
            <NumberStepper
              value={metric?.overallPain}
              onChange={(v) => upsert({ overallPain: v })}
              max={10}
            />
          </Field>
        </div>
      )}
    </Card>
  );
}
