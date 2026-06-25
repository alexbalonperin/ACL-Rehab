"use client";

import { db } from "./db";
import type { BackupBundle } from "./types";
import { today } from "./date";

/** Export all data as a downloadable JSON file. */
export async function exportBackup(): Promise<void> {
  const bundle = await db.exportAll();
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${today()}-acl-backup.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parse + validate a backup file, then replace all data with its contents. */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  let bundle: BackupBundle;
  try {
    bundle = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!bundle || typeof bundle !== "object" || !Array.isArray(bundle.exercises)) {
    throw new Error("That doesn't look like an ACL Rehab backup file.");
  }
  await db.importAll(bundle);
}
