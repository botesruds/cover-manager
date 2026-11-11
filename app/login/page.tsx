import { LoginForm } from "./LoginForm.tsx";

export default function LoginPage() {
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <div className="card p-6">
        <h1 className="text-lg font-semibold text-brand-700">Cover Manager</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to set and track cover.</p>
        <LoginForm />
      </div>
    </main>
  );
}
