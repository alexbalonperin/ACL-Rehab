"use client";

import { useState } from "react";
import type { PtNote } from "@/lib/types";
import { db } from "@/lib/db";
import { newId } from "@/lib/id";
import { today, shortLabel } from "@/lib/date";
import { usePtNotes } from "@/lib/hooks/useData";
import {
  Button,
  Card,
  Field,
  Sheet,
  TextArea,
  TextInput,
} from "@/components/ui/primitives";

function PtNoteForm({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: PtNote;
}) {
  const [date, setDate] = useState(existing?.date ?? today());
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [clearanceChange, setClearanceChange] = useState(existing?.clearanceChange ?? false);

  async function save() {
    if (!body.trim()) return;
    const note: PtNote = {
      id: existing?.id ?? newId(),
      date,
      title: title.trim() || undefined,
      body: body.trim(),
      clearanceChange,
    };
    if (existing) await db.ptNotes.update(existing.id, note);
    else await db.ptNotes.add(note);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={existing ? "Edit PT note" : "Add PT note"}>
      <div className="space-y-3">
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Title (optional)">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="6-week review" />
        </Field>
        <Field label="Notes">
          <TextArea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[120px]" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={clearanceChange}
            onChange={(e) => setClearanceChange(e.target.checked)}
            className="h-5 w-5 accent-teal-600"
          />
          This visit changed my clearance
        </label>
        <div className="flex gap-2 pt-2">
          {existing && (
            <Button
              variant="danger"
              onClick={async () => {
                if (confirm("Delete this note?")) {
                  await db.ptNotes.remove(existing.id);
                  onClose();
                }
              }}
            >
              Delete
            </Button>
          )}
          <Button className="flex-1" onClick={save} disabled={!body.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function PtNotesPanel() {
  const notes = usePtNotes();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PtNote | undefined>(undefined);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold">PT / surgeon notes</h3>
          <p className="text-xs text-neutral-500">Visits, instructions, clearance changes</p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          Add
        </Button>
      </div>

      {!notes || notes.length === 0 ? (
        <p className="py-3 text-center text-sm text-neutral-400">No notes yet</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setEditing(n);
                setOpen(true);
              }}
              className="block w-full rounded-xl border border-neutral-200 p-3 text-left dark:border-neutral-800"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500">{shortLabel(n.date)}</span>
                {n.clearanceChange && (
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                    CLEARANCE
                  </span>
                )}
              </div>
              {n.title && <p className="font-semibold">{n.title}</p>}
              <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{n.body}</p>
            </button>
          ))}
        </div>
      )}

      {open && <PtNoteForm open={open} onClose={() => setOpen(false)} existing={editing} />}
    </Card>
  );
}
