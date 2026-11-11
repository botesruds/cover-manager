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
      <div className="mx-auto flex max-w-7xl items-center gap-x-6 px-4 py-2.5">
        <Link href="/" className="hidden text-base font-semibold text-brand-700 sm:block">
          Cover Manager
        </Link>
        <nav className="-mx-1 flex gap-0.5 overflow-x-auto">
          {LINKS.map((l) => {
            const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap sm:px-3 ${
                  on ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOut} className="ml-auto">
          <button className="cursor-pointer text-sm whitespace-nowrap text-slate-500 hover:text-slate-800">Sign out</button>
        </form>
      </div>
    </header>
  );
}
