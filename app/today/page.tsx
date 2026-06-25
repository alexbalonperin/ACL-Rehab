import { SessionBar } from "@/components/today/SessionBar";
import { TodayList } from "@/components/today/TodayList";
import { NmesForm } from "@/components/today/NmesForm";
import { DailyCheckin } from "@/components/today/DailyCheckin";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { SectionTitle } from "@/components/ui/primitives";

export default function TodayPage() {
  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">Today</h1>
      <DisclaimerBanner />
      <SessionBar />

      <SectionTitle>Active exercises</SectionTitle>
      <TodayList />

      <SectionTitle>Check-ins</SectionTitle>
      <div className="space-y-3">
        <DailyCheckin />
        <NmesForm />
      </div>
    </div>
  );
}
