"use client";

import { useEffect, useState } from "react";
import type { Stage } from "@/lib/types";
import { db } from "@/lib/db";
import { newId } from "@/lib/id";
import { Button, Field, Sheet, TextArea, TextInput } from "@/components/ui/primitives";

export function StageForm({
  open,
  onClose,
  existing,
  nextOrder,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Stage;
  nextOrder: number;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [note, setNote] = useState(existing?.note ?? "");

  useEffect(() => {
    setName(existing?.name ?? "");
    setNote(existing?.note ?? "");
  }, [existing, open]);

  async function save() {
    if (!name.trim()) return;
    if (existing) {
      await db.stages.update(existing.id, { name: name.trim(), note: note.trim() || undefined });
    } else {
      await db.stages.add({ id: newId(), name: name.trim(), order: nextOrder, note: note.trim() || undefined });
    }
    onClose();
  }

  async function remove() {
    if (!existing) return;
    const exs = await db.exercises.liveByStage(existing.id);
    if (
      confirm(
        `Delete stage "${existing.name}"${exs.length ? ` and its ${exs.length} exercise(s)` : ""}?`,
      )
    ) {
      await Promise.all(exs.map((e) => db.exercises.remove(e.id)));
      await db.stages.remove(existing.id);
      onClose();
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={existing ? "Edit stage" : "Add stage"}>
      <div className="space-y-3">
        <Field label="Name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Phase 1 — Weeks 0–2"
            autoFocus
          />
        </Field>
        <Field label="Note (optional)">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex gap-2 pt-2">
          {existing && (
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
