import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1e3a5f] p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">Factory production</div>
          <h1 className="text-2xl font-semibold text-[#1e3a5f]">Sign in</h1>
          <p className="mt-1 text-sm text-slate-600">Record shifts, track completeness, and generate reports.</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-xs text-slate-500">
          Built by Selase I.T. Solutions.
        </p>
      </div>
    </div>
  );
}
