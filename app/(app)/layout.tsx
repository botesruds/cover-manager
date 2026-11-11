import { Nav } from "@/components/Nav.tsx";
import { getSessionInfo } from "@/lib/data.ts";
import { signOut } from "../actions.ts";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, allowed } = await getSessionInfo();
  if (!user) redirect("/login");
  if (!allowed) {
    return (
      <main className="mx-auto mt-24 max-w-md px-4">
        <div className="card p-6">
          <h1 className="text-lg font-semibold">No access yet</h1>
          <p className="mt-2 text-sm text-slate-600">
            You are signed in as {user.email}, but this account has not been given access to Cover
            Manager. Ask the person who runs cover to add your email.
          </p>
          <form action={signOut} className="mt-4">
            <button className="btn-ghost">Sign out</button>
          </form>
        </div>
      </main>
    );
  }
  return (
    <>
      <Nav signOut={signOut} />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </>
  );
}
