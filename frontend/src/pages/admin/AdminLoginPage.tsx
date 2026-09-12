/** Admin sign-in. Credentials are exchanged for a short-lived JWT. */
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { asApiError } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/Field";
import { useAuth } from "../../hooks/authContext";

export function AdminLoginPage() {
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (caught) {
      // The API returns the same message for unknown email and wrong password,
      // so the form cannot be used to discover valid admin addresses.
      setError(asApiError(caught).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white"
              aria-hidden="true"
            >
              C
            </span>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Course<span className="text-brand-600">Pulse</span>
            </span>
          </Link>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-extrabold">Admin sign in</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage courses, moderate feedback and view platform statistics.
          </p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
            <TextField
              id="admin-email"
              label="Email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@coursepulse.dev"
            />
            <TextField
              id="admin-password"
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />

            {error && (
              <p
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
                role="alert"
              >
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Admin accounts are created with <code>make create-admin</code> - credentials come from the
          environment, never from source control.
        </p>
      </div>
    </div>
  );
}
