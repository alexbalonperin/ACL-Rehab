"use client";

import { db, SURGERY_DATE_KEY } from "@/lib/db";
import { useSurgeryDate } from "@/lib/hooks/useData";
import { Card, Field } from "@/components/ui/primitives";

export function SurgeryDateSetting() {
  const surgeryDate = useSurgeryDate();

  return (
    <Card>
      <Field label="Surgery date" hint="Anchors the week-by-week Timeline (week 1 = surgery week).">
        <input
          type="date"
          value={surgeryDate}
          onChange={(e) => {
            if (e.target.value) db.meta.set(SURGERY_DATE_KEY, e.target.value);
          }}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-base text-neutral-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
      </Field>
    </Card>
  );
}
