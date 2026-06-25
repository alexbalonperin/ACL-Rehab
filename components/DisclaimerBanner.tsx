"use client";

import { useEffect, useState } from "react";

const KEY = "acl_disclaimer_dismissed_v1";

export function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(KEY) === "true");
  }, []);

  if (dismissed) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-lg leading-none">⚠️</span>
        <div className="flex-1">
          <p className="font-semibold">Placeholders — confirm with your care team</p>
          <p className="mt-1 leading-snug">
            All seed exercises, sets, reps and progressions are{" "}
            <strong>placeholders</strong>. Confirm everything with your surgeon /
            physiotherapist. This app tracks the plan they give you — it does not
            prescribe one.
          </p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(KEY, "true");
            setDismissed(true);
          }}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:text-amber-300"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
