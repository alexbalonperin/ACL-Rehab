// Non-dismissable: rehab progression is a clinical decision, so this banner is
// always visible wherever phases/criteria are shown.
export function ClinicalDisclaimer() {
  return (
    <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-lg leading-none">
          ⚠️
        </span>
        <p className="flex-1 leading-snug">
          <strong>General educational structure — not medical advice.</strong>{" "}
          Timeframes and exit criteria are guidance only. Confirm every phase
          progression and any return-to-sport decision with your surgeon /
          physiotherapy team.
        </p>
      </div>
    </div>
  );
}
