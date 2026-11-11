"use client";

import { usePathname, useRouter } from "next/navigation";

/** Jump to a date. `compact` shows a small "Pick a date" link-style control. */
export function DatePicker({ value, compact }: { value: string; compact?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const go = (v: string) => v && router.push(`${path}?date=${v}`);
  if (compact) {
    return (
      <label className="relative cursor-pointer text-brand-700 hover:underline">
        Pick a date
        <input
          type="date"
          aria-label="Pick a date"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value}
          onChange={(e) => go(e.target.value)}
          onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
        />
      </label>
    );
  }
  return <input type="date" className="input w-auto" value={value} onChange={(e) => go(e.target.value)} />;
}
