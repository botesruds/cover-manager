"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Set cover" },
  { href: "/week", label: "This week" },
  { href: "/history", label: "History" },
  { href: "/rota", label: "Rota" },
];

export function Nav({ signOut }: { signOut: () => Promise<void> }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-base font-semibold text-brand-700">
          Cover Manager
        </Link>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((l) => {
            const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  on ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOut} className="ml-auto">
          <button className="text-sm text-slate-500 hover:text-slate-800">Sign out</button>
        </form>
      </div>
    </header>
  );
}
