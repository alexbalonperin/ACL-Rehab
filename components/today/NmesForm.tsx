"use client";

import { useState } from "react";
import {
  NMES_DEVICE_DEFAULT,
  NMES_TARGET_DEFAULT,
  type NmesSession,
} from "@/lib/types";
import { db } from "@/lib/db";
import { newId } from "@/lib/id";
import { today } from "@/lib/date";
import { useSessionStore } from "@/lib/session-store";
import { useTodayNmes } from "@/lib/hooks/useData";
import {
  Button,
  Card,
  Field,
  NumberStepper,
  TextArea,
  TextInput,
} from "@/components/ui/primitives";

export function NmesForm() {
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const todayNmes = useTodayNmes();
  const [open, setOpen] = useState(false);

  const [device, setDevice] = useState(NMES_DEVICE_DEFAULT);
  const [program, setProgram] = useState("Strength");
  const [targetMuscle, setTargetMuscle] = useState(NMES_TARGET_DEFAULT);
  const [intensityMa, setIntensityMa] = useState<number | undefined>(30);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>(20);
  const [painLevel, setPainLevel] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");

  async function save() {
    const entry: NmesSession = {
      id: newId(),
      date: today(),
      sessionId: currentSessionId(),
      device,
      program,
      targetMuscle,
      intensityMa: intensityMa ?? 0,
      durationMinutes: durationMinutes ?? 0,
      painLevel,
      notes: notes || undefined,
    };
    await db.nmes.add(entry);
    setNotes("");
    setPainLevel(undefined);
    setOpen(false);
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold">NMES / e-stim</h3>
          <p className="text-xs text-neutral-500">
            {todayNmes && todayNmes.length > 0
              ? `${todayNmes.length} logged today · last ${todayNmes[todayNmes.length - 1].intensityMa} mA`
              : "Rising tolerated mA is a key quad-reactivation signal."}
          </p>
        </div>
        <Button variant={open ? "secondary" : "primary"} onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "Log NMES"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <Field label="Device">
            <TextInput value={device} onChange={(e) => setDevice(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Program">
              <TextInput value={program} onChange={(e) => setProgram(e.target.value)} />
            </Field>
            <Field label="Target muscle">
              <TextInput
                value={targetMuscle}
                onChange={(e) => setTargetMuscle(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Intensity (mA)">
              <NumberStepper value={intensityMa} onChange={setIntensityMa} max={150} />
            </Field>
            <Field label="Duration (min)">
              <NumberStepper value={durationMinutes} onChange={setDurationMinutes} max={120} />
            </Field>
          </div>
          <Field label="Pain (0–10, optional)">
            <NumberStepper value={painLevel} onChange={setPainLevel} max={10} />
          </Field>
          <Field label="Notes (optional)">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button className="w-full" onClick={save}>
            Save NMES session
          </Button>
        </div>
      )}
    </Card>
  );
}
