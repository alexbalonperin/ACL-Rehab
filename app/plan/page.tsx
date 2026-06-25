import { Board } from "@/components/plan/Board";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";

export default function PlanPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Plan</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Move exercises between buckets — tap the arrows on mobile, or drag on desktop.
      </p>
      <DisclaimerBanner />
      <Board />
    </div>
  );
}
