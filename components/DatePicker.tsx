"use client";

import { usePathname, useRouter } from "next/navigation";

export function DatePicker({ value }: { value: string }) {
  const router = useRouter();
  const path = usePathname();
  return (
    <input
      type="date"
      className="input w-auto"
      value={value}
      onChange={(e) => e.target.value && router.push(`${path}?date=${e.target.value}`)}
    />
  );
}
