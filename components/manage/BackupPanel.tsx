"use client";

import { useRef, useState } from "react";
import { db } from "@/lib/db";
import { exportBackup, importBackup } from "@/lib/backup";
import { Button, Card } from "@/components/ui/primitives";

export function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function onImport(file: File) {
    if (!confirm("Importing will REPLACE all current data. Continue?")) return;
    try {
      await importBackup(file);
      setStatus("✅ Imported successfully.");
    } catch (e) {
      setStatus(`⚠️ ${e instanceof Error ? e.message : "Import failed."}`);
    }
  }

  return (
    <Card>
      <h3 className="font-bold">Backup &amp; data</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Your data lives only on this device. iOS can clear it under storage pressure, so
        export a JSON backup regularly.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => exportBackup()}>
          ⬇ Export JSON
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          ⬆ Import JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-500">Danger zone</p>
        <Button
          variant="danger"
          className="mt-2"
          onClick={async () => {
            if (confirm("Reset ALL data and restore the default seed protocol?")) {
              await db.resetAndReseed();
              setStatus("✅ Reset to default protocol.");
            }
          }}
        >
          Reset &amp; reseed
        </Button>
      </div>

      {status && <p className="mt-3 text-sm">{status}</p>}
    </Card>
  );
}
