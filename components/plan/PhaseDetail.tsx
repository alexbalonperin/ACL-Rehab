"use client";

import { useState } from "react";
import clsx from "clsx";
import type { PhaseCriterion, Stage } from "@/lib/types";
import { db } from "@/lib/db";
import { phaseReadiness, longDate } from "@/lib/rehab";
import { Chip } from "@/components/ui/primitives";

function windowLabel(stage: Stage): string | null {
  if (stage.minWeekPostOp == null) return null;
  return stage.maxWeekPostOp != null
    ? `Weeks ${stage.minWeekPostOp}–${stage.maxWeekPostOp}`
    : `Weeks ${stage.minWeekPostOp}+`;
}

function updatedLabel(ms?: number): string | null {
  if (!ms) return null;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function CriterionRow({ stage, c }: { stage: Stage; c: PhaseCriterion }) {
  const [noteOpen, setNoteOpen] = useState(Boolean(c.note));
  const [noteDraft, setNoteDraft] = useState(c.note ?? "");

  const toggle = () => db.stages.setCriterion(stage.id, c.id, { checked: !c.checked });
  const saveNote = () => {
    const trimmed = noteDraft.trim();
    if (trimmed !== (c.note ?? "")) {
      db.stages.setCriterion(stage.id, c.id, { note: trimmed });
    }
  };

  const updated = updatedLabel(c.updatedAt);

  return (
    <li className="rounded-xl border border-neutral-200 p-2 dark:border-neutral-800">
      <div className="flex items-start gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={c.checked}
          onClick={toggle}
          className={clsx(
            "mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 text-sm font-bold transition-colors",
            c.checked
              ? "border-brand bg-brand text-white"
              : "border-neutral-300 text-transparent dark:border-neutral-600",
          )}
        >
          ✓
        </button>
        <button type="button" onClick={toggle} className="flex-1 text-left">
          <span
            className={clsx(
              "text-sm leading-snug",
              c.checked && "text-neutral-400 line-through",
            )}
          >
            {c.label}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setNoteOpen((v) => !v)}
          className="flex-none rounded-md px-1.5 py-0.5 text-xs font-medium text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label={noteOpen ? "hide note" : "add note"}
        >
          {c.note ? "📝" : "＋ note"}
        </button>
      </div>

      {noteOpen && (
        <div className="mt-2 pl-8">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={saveNote}
            placeholder="Measured values, PT comments…"
            className="min-h-[44px] w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          />
          {updated && (
            <p className="mt-1 text-[11px] text-neutral-400">Updated {updated}</p>
          )}
        </div>
      )}
      {!noteOpen && updated && (
        <p className="mt-1 pl-8 text-[11px] text-neutral-400">Updated {updated}</p>
      )}
    </li>
  );
}

export function PhaseDetail({
  stage,
  weeks,
  todayStr,
  surgeryDate,
  isCurrent,
}: {
  stage: Stage;
  weeks: number;
  todayStr: string;
  surgeryDate: string;
  isCurrent: boolean;
}) {
  const [open, setOpen] = useState(isCurrent);

  const hasClinical =
    (stage.goals?.length ?? 0) > 0 || (stage.gatingCriteria?.length ?? 0) > 0;
  if (!hasClinical) return null;

  const r = phaseReadiness(stage, weeks, todayStr, surgeryDate);
  const wl = windowLabel(stage);

  return (
    <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Goals &amp; exit criteria
        </span>
        {wl && <Chip tone="neutral">{wl}</Chip>}
        {isCurrent && <Chip tone="brand">Current</Chip>}
        {r.totalCount > 0 && (
          <span className="text-xs text-neutral-400">
            {r.checkedCount}/{r.totalCount}
          </span>
        )}
        <span className="ml-auto text-neutral-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-3 px-3 pb-3">
          {stage.hardGate && (
            <HardGatePanel daysToGate={r.daysToGate ?? 0} hardGateDate={r.hardGateDate} locked={r.hardLocked} />
          )}

          {stage.goals && stage.goals.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Goals
              </p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
                {stage.goals.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {stage.gatingCriteria && stage.gatingCriteria.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Gating exit criteria
              </p>
              <ul className="space-y-1.5">
                {stage.gatingCriteria.map((c) => (
                  <CriterionRow key={c.id} stage={stage} c={c} />
                ))}
              </ul>
            </div>
          )}

          <ReadinessBanner stage={stage} r={r} weeks={weeks} />
        </div>
      )}
    </div>
  );
}

function HardGatePanel({
  daysToGate,
  hardGateDate,
  locked,
}: {
  daysToGate: number;
  hardGateDate?: string;
  locked: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-3 text-sm",
        locked
          ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
          : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200",
      )}
    >
      <div className="flex items-center gap-2 font-semibold">
        <span aria-hidden>{locked ? "🔒" : "🔓"}</span>
        {locked ? "9-month hard gate — locked" : "9-month hard gate cleared"}
      </div>
      {locked ? (
        <p className="mt-1 leading-snug">
          Return to sport cannot be cleared before{" "}
          <strong>{hardGateDate ? longDate(hardGateDate) : "9 months post-op"}</strong>
          {" "}— <strong>{daysToGate}</strong> day{daysToGate === 1 ? "" : "s"} to go,
          even if every criterion below is checked.
        </p>
      ) : (
        <p className="mt-1 leading-snug">
          You are at least 9 months post-op. The remaining criteria below still
          gate clearance.
        </p>
      )}
      <p className="mt-2 text-xs leading-snug opacity-90">
        Why: each month of delay toward 9 months reduces reinjury risk by ~51%,
        and returning before 9 months is associated with roughly 7× the rate of a
        second ACL injury.
      </p>
    </div>
  );
}

function ReadinessBanner({
  stage,
  r,
  weeks,
}: {
  stage: Stage;
  r: ReturnType<typeof phaseReadiness>;
  weeks: number;
}) {
  if (r.ready) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
        ✓ {stage.hardGate ? "Clearable" : "Ready to advance"}
      </div>
    );
  }

  const reasons: string[] = [];
  if (!r.allChecked) {
    const remaining = r.totalCount - r.checkedCount;
    reasons.push(
      `${remaining} ${remaining === 1 ? "criterion" : "criteria"} still to check`,
    );
  }
  if (stage.hardGate && r.hardLocked) {
    reasons.push(`hard gate lifts in ${r.daysToGate} day${r.daysToGate === 1 ? "" : "s"}`);
  } else if (!r.timeElapsed && stage.maxWeekPostOp != null) {
    const wks = Math.max(0, stage.maxWeekPostOp - weeks);
    reasons.push(`time window: ~${wks} more week${wks === 1 ? "" : "s"}`);
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
      Not ready yet — {reasons.join("; ")}.
    </div>
  );
}
