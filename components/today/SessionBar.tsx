"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/lib/session-store";
import { formatDuration } from "@/lib/date";
import { Button } from "@/components/ui/primitives";

export function SessionBar() {
  const { activeSession, start, end, hydrated } = useSessionStore();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!activeSession) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activeSession]);

  if (!hydrated) {
    return <div className="mb-4 h-14 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-900" />;
  }

  if (!activeSession) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="text-sm text-neutral-500">
          Log freely — or start a session to group entries.
        </div>
        <Button onClick={() => start()}>Start session</Button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-brand/40 bg-brand/10 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          Session active
        </p>
        <p className="font-mono text-lg font-bold tabular-nums">
          {formatDuration(now - activeSession.startedAt)}
        </p>
      </div>
      <Button variant="danger" onClick={() => end()}>
        End session
      </Button>
    </div>
  );
}
