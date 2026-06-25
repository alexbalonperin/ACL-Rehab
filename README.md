# ACL Rehab Tracker

A personal, single-user, mobile-first web app to track ACL reconstruction rehab.
Local-first (no backend, no login), installable as a PWA, works offline.

> ⚠️ **Medical disclaimer:** All seed exercises, sets, reps and progressions are
> **placeholders**. Confirm everything with your surgeon / physiotherapist. This
> app *tracks* the plan they give you — it does not prescribe one.

## Features

- **Plan / Board** — exercises grouped by rehab stage, with three buckets
  (Upcoming / Active / Graduated). Move with tap arrows on mobile or drag-and-drop
  on desktop. Tap a card for how-to steps, muscles, timings and notes.
- **Today** — checklist of your *active* exercises. Mark done, log pain + notes,
  and run an optional in-exercise hold/rest timer. Log NMES / e-stim sessions
  (device, program, target muscle, intensity in mA, duration). A daily knee
  check-in captures ROM, swelling/girth and overall pain.
  - **Sessions** — “Start session” groups everything you log until you “End
    session”. Logging *without* a session always works; unsessioned entries are
    first-class.
- **Progress** — activity heatmap, current streak, sessions/week vs active-days,
  average session duration, per-exercise history, and charts for pain, volume and
  (prominently) **NMES intensity over time**, plus ROM / swelling / daily pain.
- **Manage** — full CRUD + reorder for stages and exercises, PT/surgeon notes, and
  JSON **export / import** for backup.

## Tech

- Next.js (App Router) + TypeScript + Tailwind CSS
- Dexie (IndexedDB) for local-first storage
- Recharts for charts
- Serwist for the PWA service worker / offline support
- @dnd-kit for drag-and-drop

All data access is isolated behind a single repository module (`lib/db.ts`), so the
storage backend can later be swapped (e.g. to Supabase) without touching the UI.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

The app seeds a default ACL protocol on first run. Edit/delete anything in **Manage**,
or use **Manage → Backup → Reset & reseed** to start over.

Other scripts:

```bash
npm run build    # production build
npm run start    # serve the production build
npm run lint     # lint
npm run icons    # regenerate the PWA icons in public/icons
```

> Note: the service worker is disabled in `npm run dev` and active in
> `npm run build` / `npm run start` and on Vercel.

## Deploy to Vercel (zero config)

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and **import** the repository.
3. Keep all defaults (framework auto-detected as **Next.js**, build `next build`,
   no environment variables needed) and click **Deploy**.
4. Open the deployment URL on your iPhone in Safari → **Share** →
   **Add to Home Screen** to install it as an app.

Or with the Vercel CLI:

```bash
npm i -g vercel
vercel        # preview deploy
vercel --prod # production deploy
```

## Backups

Your data lives **only on this device’s browser storage**. iOS can clear IndexedDB
under storage pressure, so export a JSON backup regularly from
**Manage → Backup → Export JSON**, and restore it with **Import JSON**.
