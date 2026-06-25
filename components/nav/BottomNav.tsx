"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { href: "/today", label: "Today", icon: "✓" },
  { href: "/plan", label: "Plan", icon: "▤" },
  { href: "/progress", label: "Progress", icon: "📈" },
  { href: "/manage", label: "Manage", icon: "⚙" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 pb-[var(--safe-bottom)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((t) => {
          const active = pathname === t.href || (t.href === "/today" && pathname === "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              className={clsx(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
                active
                  ? "text-brand"
                  : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
              )}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
