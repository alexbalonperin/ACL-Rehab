"use client";

import { create } from "zustand";
import type { Session } from "./types";
import { db } from "./db";
import { today } from "./date";

interface SessionState {
  activeSession: Session | null;
  hydrated: boolean;
  /** Look up any open session in storage (survives reload/crash). */
  hydrate: () => Promise<void>;
  start: () => Promise<void>;
  end: (notes?: string) => Promise<void>;
  /** Current session id to attach to new entries, or null when unsessioned. */
  currentSessionId: () => string | null;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  hydrated: false,
  hydrate: async () => {
    const active = await db.sessions.getActive();
    set({ activeSession: active ?? null, hydrated: true });
  },
  start: async () => {
    if (get().activeSession) return;
    const session = await db.sessions.start(today());
    set({ activeSession: session });
  },
  end: async (notes) => {
    const active = get().activeSession;
    if (!active) return;
    await db.sessions.end(active.id, notes);
    set({ activeSession: null });
  },
  currentSessionId: () => get().activeSession?.id ?? null,
}));
