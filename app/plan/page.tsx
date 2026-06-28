import { Board } from "@/components/plan/Board";
import { RehabOverview } from "@/components/plan/RehabOverview";

export default function PlanPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Plan</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Track each phase&apos;s goals and gating exit criteria, and move exercises
        between buckets — tap the arrows on mobile, or drag on desktop.
      </p>
      <RehabOverview />
      <Board />
    </div>
  );
}
