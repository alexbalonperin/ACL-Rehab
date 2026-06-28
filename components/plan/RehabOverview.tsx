"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import {
  GRAFT_TYPE_KEY,
  SURGERY_DATE_KEY,
  TARGET_SPORT_KEY,
} from "@/lib/types";
import { useRehabSettings, useStages } from "@/lib/hooks/useData";
import {
  currentPhaseId,
  daysPostOp,
  effectiveHardGateDate,
  longDate,
  weeksPostOp,
} from "@/lib/rehab";
import { tokyoToday } from "@/lib/date";
import {
  Button,
  Card,
  Chip,
  Field,
  Sheet,
  TextInput,
} from "@/components/ui/primitives";
import { ClinicalDisclaimer } from "./ClinicalDisclaimer";

export function RehabOverview() {
  const settings = useRehabSettings();
  const stages = useStages();
  const [editing, setEditing] = useState(false);

  if (!settings || !stages) {
    return <div className="mb-4 h-28 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />;
  }

  const todayStr = tokyoToday();
  const days = daysPostOp(settings.surgeryDate, todayStr);
  const weeks = weeksPostOp(settings.surgeryDate, todayStr);
  const preOp = days < 0;
  const currentId = currentPhaseId(stages, weeks);
  const currentName = stages.find((s) => s.id === currentId)?.name;

  return (
    <div className="mb-4">
      <ClinicalDisclaimer />
      <Card>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Post-op (Asia/Tokyo)
            </p>
            <p className="mt-0.5 text-2xl font-extrabold text-brand">
              {preOp ? `${Math.abs(days)} days to surgery` : `Day ${days} · Week ${weeks}`}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Surgery {longDate(settings.surgeryDate)}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Chip tone="neutral">{settings.graftType}</Chip>
          <Chip tone="neutral">Target: {settings.targetSport}</Chip>
        </div>

        {currentName && (
          <p className="mt-3 text-sm">
            <span className="text-neutral-500">Current phase by time: </span>
            <span className="font-semibold">{currentName}</span>
          </p>
        )}
      </Card>

      {editing && (
        <SettingsSheet
          open={editing}
          onClose={() => setEditing(false)}
          initial={settings}
        />
      )}
    </div>
  );
}

function SettingsSheet({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial: { surgeryDate: string; graftType: string; targetSport: string };
}) {
  const [surgeryDate, setSurgeryDate] = useState(initial.surgeryDate);
  const [graftType, setGraftType] = useState(initial.graftType);
  const [targetSport, setTargetSport] = useState(initial.targetSport);

  useEffect(() => {
    setSurgeryDate(initial.surgeryDate);
    setGraftType(initial.graftType);
    setTargetSport(initial.targetSport);
  }, [initial, open]);

  async function save() {
    if (!surgeryDate) return;
    await db.meta.set(SURGERY_DATE_KEY, surgeryDate);
    await db.meta.set(GRAFT_TYPE_KEY, graftType.trim() || initial.graftType);
    await db.meta.set(TARGET_SPORT_KEY, targetSport.trim() || initial.targetSport);

    // Re-derive the return-to-sport hard-gate date from the new surgery date.
    if (surgeryDate !== initial.surgeryDate) {
      const stages = await db.stages.getAll();
      await Promise.all(
        stages
          .filter((s) => s.hardGate)
          .map((s) =>
            db.stages.update(s.id, {
              hardGateDate: effectiveHardGateDate({ hardGateMonthsPostOp: 9 }, surgeryDate),
            }),
          ),
      );
    }
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Rehab settings">
      <div className="space-y-3">
        <Field label="Surgery date" hint="Drives post-op timing and the 9-month return-to-sport gate.">
          <TextInput
            type="date"
            value={surgeryDate}
            onChange={(e) => setSurgeryDate(e.target.value)}
          />
        </Field>
        <Field label="Graft type">
          <TextInput value={graftType} onChange={(e) => setGraftType(e.target.value)} />
        </Field>
        <Field label="Target sport">
          <TextInput value={targetSport} onChange={(e) => setTargetSport(e.target.value)} />
        </Field>
        <div className="pt-2">
          <Button className="w-full" onClick={save} disabled={!surgeryDate}>
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
