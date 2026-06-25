export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-5xl">📴</p>
      <h1 className="mt-4 text-xl font-bold">You&apos;re offline</h1>
      <p className="mt-2 max-w-xs text-sm text-neutral-500">
        This page isn&apos;t cached yet. Your logged data is safe on this device — reconnect
        and it&apos;ll load normally.
      </p>
    </div>
  );
}
