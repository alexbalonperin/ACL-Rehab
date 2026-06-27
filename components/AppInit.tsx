"use client";

import { useEffect } from "react";
import { db } from "@/lib/db";
import { useSessionStore } from "@/lib/session-store";

/**
 * Runs once on the client: seeds the default protocol on first run and
 * rehydrates any open session left from a previous visit.
 */
export function AppInit() {
  const hydrate = useSessionStore((s) => s.hydrate);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await db.ensureSeeded();
      await db.ensureTimelineDefaults();
      if (!cancelled) await hydrate();
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);
  return null;
}
