# CLAUDE.md

Guidance for working in this repository. Read this first — it should remove the need
to re-read the whole codebase.

## What this is

A **personal, single-user ACL reconstruction rehab tracker**. Mobile-first PWA, used
mainly on iPhone (installed to the home screen), sometimes on a laptop. **No login, no
backend, no multi-user, no marketing pages.** All data is **local-first** in the
browser (IndexedDB via Dexie) and backed up by JSON export/import. Deploys to Vercel
zero-config.

It **tracks** a rehab plan the user's surgeon/physiotherapist gives them — it does not
prescribe one. All seed exercises/sets/reps are **placeholders** and a dismissible
disclaimer banner says so. Keep that framing in any user-facing copy.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000 — SERVICE WORKER DISABLED in dev
npm run build    # production build (also type-checks + would fail on TS errors)
npm run start    # serve the production build (SW active) — use a custom PORT to test
npm run lint     # eslint (next lint); must be clean
npm run icons    # regenerate PWA icons into public/icons via scripts/generate-icons.mjs
```

Node 22 / npm 10. No test runner is configured — verification is done by building and
driving the app in a browser (see "Verifying changes").

## Tech stack

- **Next.js (App Router) + TypeScript + Tailwind** (Tailwind v3, `darkMode: "media"`).
- **dexie** + **dexie-react-hooks** — IndexedDB store + `useLiveQuery` reactive UI.
- **zustand** — global active-session state (`lib/session-store.ts`).
- **@dnd-kit** (core/sortable/modifiers/utilities) — drag-and-drop on the Plan board.
- **recharts** — all charts on Progress.
- **@serwist/next + serwist** — PWA service worker (`app/sw.ts` → `public/sw.js`).
- **clsx** — conditional class names.
- Calendar heatmap is hand-rolled (no extra dep).

## The one rule that matters most: the data seam

**All data access goes through `lib/db.ts`.** It is the *only* module that imports
Dexie or touches IndexedDB. The UI imports the `db` singleton, which implements the
typed `AppRepository` interface. This exists so the storage backend can later be swapped
(e.g. to Supabase) by writing a new `class SupabaseRepository implements AppRepository`
and changing the single `export const db = ...` line — **without touching any UI**.

Consequences when editing:
- **Never** import `dexie` or call IndexedDB outside `lib/db.ts`.
- Components/hooks call repository methods only (e.g. `db.exercises.liveByStatus("active")`).
- React hooks subscribe via `useLiveQuery(() => db.x.liveY(), [deps])` — the query body
  still only calls repository methods. All such hooks live in `lib/hooks/useData.ts`.
- Repository "live*" methods return plain `Promise<T[]>` so the signature stays
  storage-agnostic; `useLiveQuery` makes them reactive.

### Repositories on `AppRepository`
`stages`, `exercises`, `sessions`, `logs`, `nmes`, `dailyMetrics`, `ptNotes`, `meta`,
plus top-level `exportAll()`, `importAll()`, `ensureSeeded()`, `resetAndReseed()`.
Each entity repo extends `CrudRepo<T>` (getAll/get/add/update/remove/bulkPut) with
domain-specific live queries (e.g. `exercises.setStatus`, `logs.upsertForExerciseToday`,
`sessions.getActive/start/end`, `dailyMetrics.upsertForDate`).

### Dexie schema (version 1) — in `lib/db.ts`
```
stages:       "id, order"
exercises:    "id, stageId, status, order, [stageId+order], [status+order]"
sessions:     "id, date, startedAt, endedAt"
logEntries:   "id, date, exerciseId, sessionId, [date+exerciseId]"
nmesSessions: "id, date, sessionId"
dailyMetrics: "id, date"
ptNotes:      "id, date"
meta:         "key"
```
**If you change this schema you MUST bump the Dexie version** (`this.version(2).stores({...})`
with an `.upgrade()` if needed). Redefining v1 with different stores breaks `db.open()`
for anyone with an existing database (it throws and the whole app hangs — live queries
never resolve, seeding never runs). Only fields you query/sort/filter on need an index;
`orderBy`/`where` on a non-indexed field throws a `DexieError` at runtime (this bit us
once with `sessions.startedAt`).

## Data model (`lib/types.ts`)

- **Stage**: `id, name, order, note?` — a rehab phase grouping exercises.
- **Exercise**: `id, name, stageId, status ("upcoming"|"active"|"graduated"), howTo[],
  musclesActivated[], difficulty (1–5), sets, reps, holdSeconds?, restBetweenRepsSeconds?,
  restBetweenSetsSeconds?, notes?, caution?, order`. `status: "active"` = cleared to do now.
- **Session**: `id, date, startedAt, endedAt?, notes?` — bundles entries logged in one
  sitting. Active = `endedAt == null`.
- **LogEntry**: `id, date, exerciseId, sessionId?(nullable), completed, setsDone?,
  repsDone?, painLevel?(0–10), notes?` — one per exercise per day.
- **NmesSession**: `id, date, sessionId?, device, program, targetMuscle, intensityMa,
  durationMinutes, painLevel?, notes?` — e-stim, modeled separately from exercises.
  `intensityMa` is the key progression metric. Defaults: device "Globus Genesy 300 Pro",
  target "Quad — operated leg" (`NMES_DEVICE_DEFAULT` / `NMES_TARGET_DEFAULT`).
- **DailyMetric**: `id, date(unique/day), romFlexionDeg?, romExtensionDeg?,
  swellingOperatedCm?, swellingOtherCm?, overallPain?(0–10), notes?` — daily knee signals.
- **PtNote**: `id, date, title?, body, clearanceChange?` — PT/surgeon visit log.
- **BackupBundle**: all of the above + `version, exportedAt` (shape of export/import).

## Conventions / invariants

- **`"use client"`** on every component or module that touches `db`, `useLiveQuery`, or
  the zustand store. Dexie is browser-only — never import `db` into a server component.
- **Dates are local `YYYY-MM-DD` strings** built via `lib/date.ts` (`today()`,
  `localDateString()`). **Never** use `toISOString().slice(0,10)` (UTC shifts the date).
  Other date helpers: `addDays`, `daysBetween`, `weekKey`, `shortLabel`, `formatDuration`.
- **IDs** via `newId()` (`lib/id.ts`) — `crypto.randomUUID()` with a fallback.
- **Live queries return `undefined` on first paint** → always render a skeleton/empty
  state, never assume data is present (avoids hydration mismatch).
- Tailwind brand color is teal (`brand` = `#0d9488`). UI primitives are in
  `components/ui/primitives.tsx` (`Button`, `Card`, `Chip`, `Field`, `TextInput`,
  `TextArea`, `NumberStepper`, `Sheet`, `SectionTitle`) — reuse these, don't hand-roll.
- Large tap targets (min-h 44px), safe-area insets, mobile-first.

## Sessions (important semantics)

`lib/session-store.ts` (zustand) holds the active session; `hydrate()` reads
`db.sessions.getActive()` on mount so an open session survives reload/crash (`AppInit`
calls it). **Unsessioned logging is first-class** — logging an exercise or NMES with no
active session writes `sessionId: null` and is never blocked. When a session is active,
new entries auto-attach `sessionId = activeSession.id` (callers pass
`currentSessionId()`).

## Directory map

```
app/
  layout.tsx            # root: <AppInit/>, <BottomNav/>, PWA meta/viewport (themeColor light+dark)
  page.tsx              # "/" → redirect("/today")
  globals.css           # tailwind + base styles + safe-area vars
  manifest.ts           # typed web manifest
  sw.ts                 # Serwist service worker source → public/sw.js (gitignored)
  today/page.tsx        # Today screen
  plan/page.tsx         # Plan board
  progress/page.tsx     # Progress / charts
  manage/page.tsx       # Manage (CRUD, PT notes, backup)
  offline/page.tsx      # offline fallback
components/
  AppInit.tsx           # client: ensureSeeded() + session hydrate on mount
  DisclaimerBanner.tsx  # dismissible placeholder/medical disclaimer (localStorage flag)
  nav/BottomNav.tsx     # Today / Plan / Progress / Manage tab bar
  ui/primitives.tsx     # shared UI primitives (see above)
  exercise/format.tsx   # summaryLine(), DifficultyDots, ExerciseDetails (expand block)
  plan/Board.tsx        # DndContext, stage sections, 3 buckets, drag + tap-move persist
  plan/ExerciseCard.tsx # sortable card + ◀/▶ status move buttons + expand
  today/SessionBar.tsx  # Start/End session + elapsed timer
  today/TodayList.tsx   # active-exercise checklist
  today/TodayExerciseRow.tsx  # check-done, pain/notes, timer launcher
  today/ExerciseTimer.tsx     # hold/rest + set-walkthrough timer (see below)
  today/NmesForm.tsx          # log an NMES session
  today/DailyCheckin.tsx      # ROM/swelling/daily-pain → DailyMetric upsert
  progress/ProgressView.tsx   # stats + heatmap + all charts + per-exercise history
  progress/CalendarHeatmap.tsx# hand-rolled activity heatmap
  progress/charts.tsx         # Recharts wrappers (ChartCard, DateLineChart, etc.)
  manage/ManageView.tsx       # stage/exercise list, reorder arrows, CRUD launchers
  manage/ExerciseForm.tsx     # full exercise add/edit sheet
  manage/StageForm.tsx        # stage add/edit sheet
  manage/PtNotesPanel.tsx     # PT notes CRUD
  manage/BackupPanel.tsx      # JSON export/import + reset & reseed
lib/
  types.ts              # all domain types + constants
  db.ts                 # THE DATA SEAM (repository interface + Dexie impl + db singleton)
  id.ts  date.ts        # newId(); local-date helpers
  seed.ts               # default protocol; buildSeedData()
  session-store.ts      # zustand active-session store
  backup.ts             # exportBackup()/importBackup() (download/parse JSON)
  hooks/useData.ts      # all useLiveQuery hooks (call repo methods only)
  hooks/useProgressData.ts # aggregates logs/nmes/sessions/metrics into chart series
scripts/generate-icons.mjs   # pure-Node PNG icon generator (no deps)
```

## Screen notes

- **Plan** (`/plan`): exercises grouped by stage into Upcoming/Active/Graduated buckets.
  Tap ◀/▶ to move (primary on mobile) **and** drag-and-drop (`@dnd-kit`, droppable id is
  `"${stageId}:${status}"`; TouchSensor has an activation delay so scroll still works).
- **Today** (`/today`): checklist of `active` exercises only; daily knee check-in; NMES
  form; SessionBar. The **ExerciseTimer** builds a phase list from an exercise: for
  hold-based exercises it counts down each rep's hold (+ rests); for rep-counted
  exercises (no `holdSeconds`) it emits a manual "Set N — do reps, tap Next" step per
  set, interleaved with between-set rest countdowns. Completion is tracked by an explicit
  `finished` state (do not reintroduce a `remaining===0`-derived "done" — it misfires on
  zero-duration work steps).
- **Progress** (`/progress`): `useProgressData()` computes activeDates/heatmap, current
  streak, completed-sessions count, active-days, sessions/week, avg session duration,
  per-exercise history, pain/volume trends, ROM/swelling/daily-pain trends, and the
  prominent **NMES intensity (mA) over time** chart. Charts are client-only Recharts.
- **Manage** (`/manage`): stage/exercise CRUD + reorder (up/down arrows), PT notes, and
  JSON export/import + danger-zone reset & reseed.

## Seeding & PWA

- First run: `AppInit` → `db.ensureSeeded()` seeds the default protocol from `lib/seed.ts`
  (guarded by a `meta.seeded` flag). Everything is editable afterward; "Reset & reseed"
  in Manage wipes and re-seeds. Seed reflects the user's stated clearance (operated-leg
  isometrics + non-operated/whole-body work as `active`; operated-leg progressions as
  `upcoming`) with `caution` notes on ambiguous-loading items.
- PWA: `next.config.ts` wraps with `withSerwist` (SW **disabled in dev**). Icons live in
  `public/icons/` and are generated by `scripts/generate-icons.mjs`. `public/sw.js` is
  **gitignored** (build artifact) — don't commit it.

## Verifying changes (no test runner)

1. `npm run build` and `npm run lint` must pass.
2. Drive the app in a browser. Playwright + Chromium are preinstalled but Playwright is a
   **global** module — import it by absolute path in an ESM script:
   `import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';`
   and launch with `executablePath: '/opt/pw-browsers/chromium'`.
3. **IndexedDB persists across Playwright runs in the same profile** and the app seeds on
   first run — for a clean first-run test use `launchPersistentContext` with a fresh temp
   profile dir per run. To debug real (unminified) errors and avoid the service worker,
   point at the **dev** server (`npm run dev`); use `npm run start` to test the prod build
   + SW. Run prod servers on a custom PORT and kill stale `next-server`/`next start`
   processes between runs (a stale server serving old HTML against a rebuilt `.next`
   makes chunks 400).

## Git / delivery workflow

- Work on a feature branch off the latest `origin/main`; commit; push with
  `git push -u origin <branch>`; open a PR into `main` (ready for review).
- Vercel auto-builds a preview per PR (project `acl-rehab`, team `haven-ai-partners`) —
  that deployment is effectively the CI (there is no GitHub Actions workflow).
- Note: the repo's **default branch is still `claude/acl-rehab-tracker-4ojb3m`** (the repo
  started empty so the first feature branch became default). `main` is the real mainline;
  switching the default is a pending GitHub-settings task for the user.
