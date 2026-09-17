"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun01Icon } from "@/lib/hugeicons";

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();

  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  // Show placeholder during SSR and initial hydration
  if (!mounted) {
    return (
      <div className="flex size-9 items-center justify-center rounded-xl border border-input/50 bg-background">
        <div className="size-4.5 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex size-9 items-center justify-center rounded-xl bg-gray-100 transition-colors hover:bg-accent dark:bg-neutral-800 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_0_0_1px_rgba(255,255,255,0.1),0_1px_2px_-1px_rgba(0,0,0,0.06),0_2px_4px_0px_rgba(0,0,0,0.04)] shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.06),0_2px_4px_0px_rgba(0,0,0,0.04)]"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <HugeiconsIcon icon={isDark ? Sun01Icon : Moon02Icon} size={18} />
    </button>
  );
};
