import { WeeklyTimeline } from "@/components/timeline/WeeklyTimeline";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";

export default function TimelinePage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Timeline</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Your recovery week by week from surgery — what to do each week and how you&apos;re
        tracking.
      </p>
      <DisclaimerBanner />
      <WeeklyTimeline />
    </div>
  );
}
