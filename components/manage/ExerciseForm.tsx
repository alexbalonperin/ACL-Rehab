"use client";

import { useEffect, useState } from "react";
import type { Difficulty, Exercise, ExerciseStatus, Stage } from "@/lib/types";
import { db } from "@/lib/db";
import { newId } from "@/lib/id";
import {
  Button,
  Field,
  NumberStepper,
  Sheet,
  TextArea,
  TextInput,
} from "@/components/ui/primitives";

const STATUSES: ExerciseStatus[] = ["upcoming", "active", "graduated"];

function emptyExercise(stageId: string, order: number): Exercise {
  return {
    id: newId(),
    name: "",
    stageId,
    status: "upcoming",
    howTo: [],
    musclesActivated: [],
    difficulty: 2,
    sets: 3,
    reps: 10,
    order,
  };
}

export function ExerciseForm({
  open,
  onClose,
  stages,
  stageId,
  existing,
  nextOrder,
}: {
  open: boolean;
  onClose: () => void;
  stages: Stage[];
  stageId: string;
  existing?: Exercise;
  nextOrder: number;
}) {
  const [ex, setEx] = useState<Exercise>(existing ?? emptyExercise(stageId, nextOrder));

  useEffect(() => {
    setEx(existing ?? emptyExercise(stageId, nextOrder));
  }, [existing, stageId, nextOrder, open]);

  const set = <K extends keyof Exercise>(k: K, v: Exercise[K]) =>
    setEx((prev) => ({ ...prev, [k]: v }));

  async function save() {
    if (!ex.name.trim()) return;
    const clean: Exercise = {
      ...ex,
      name: ex.name.trim(),
      howTo: ex.howTo.map((s) => s.trim()).filter(Boolean),
      musclesActivated: ex.musclesActivated.map((s) => s.trim()).filter(Boolean),
    };
    if (existing) {
      await db.exercises.update(existing.id, clean);
    } else {
      await db.exercises.add(clean);
    }
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={existing ? "Edit exercise" : "Add exercise"}>
      <div className="space-y-3">
        <Field label="Name">
          <TextInput value={ex.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Stage">
            <select
              value={ex.stageId}
              onChange={(e) => set("stageId", e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-base dark:border-neutral-700 dark:bg-neutral-950"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={ex.status}
              onChange={(e) => set("status", e.target.value as ExerciseStatus)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-base capitalize dark:border-neutral-700 dark:bg-neutral-950"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sets">
            <NumberStepper value={ex.sets} onChange={(v) => set("sets", v ?? 0)} max={50} />
          </Field>
          <Field label="Reps">
            <NumberStepper value={ex.reps} onChange={(v) => set("reps", v ?? 0)} max={200} />
          </Field>
        </div>

        <Field label={`Difficulty: ${ex.difficulty}/5`}>
          <input
            type="range"
            min={1}
            max={5}
            value={ex.difficulty}
            onChange={(e) => set("difficulty", Number(e.target.value) as Difficulty)}
            className="w-full accent-teal-600"
          />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Hold (s)">
            <NumberStepper value={ex.holdSeconds} onChange={(v) => set("holdSeconds", v)} max={300} />
          </Field>
          <Field label="Rest/rep (s)">
            <NumberStepper
              value={ex.restBetweenRepsSeconds}
              onChange={(v) => set("restBetweenRepsSeconds", v)}
              max={300}
            />
          </Field>
          <Field label="Rest/set (s)">
            <NumberStepper
              value={ex.restBetweenSetsSeconds}
              onChange={(v) => set("restBetweenSetsSeconds", v)}
              max={600}
            />
          </Field>
        </div>

        <Field label="How-to steps (one per line)">
          <TextArea
            value={ex.howTo.join("\n")}
            onChange={(e) => set("howTo", e.target.value.split("\n"))}
            placeholder={"Sit with leg straight\nTighten the thigh\nHold, then relax"}
          />
        </Field>

        <Field label="Muscles activated (comma separated)">
          <TextInput
            value={ex.musclesActivated.join(", ")}
            onChange={(e) => set("musclesActivated", e.target.value.split(","))}
            placeholder="Quadriceps, VMO"
          />
        </Field>

        <Field label="Notes (optional)">
          <TextArea value={ex.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <Field label="Caution (optional)" hint="Shown when the exercise may load the operated leg">
          <TextInput value={ex.caution ?? ""} onChange={(e) => set("caution", e.target.value)} />
        </Field>

        <div className="flex gap-2 pt-2">
          {existing && (
            <Button
              variant="danger"
              onClick={async () => {
                if (confirm(`Delete "${existing.name}"?`)) {
                  await db.exercises.remove(existing.id);
                  onClose();
                }
              }}
            >
              Delete
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={!ex.name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
