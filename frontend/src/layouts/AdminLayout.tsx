/** Layout for the authenticated admin area. */
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/authContext";

const ADMIN_LINKS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/courses", label: "Courses", end: false },
  { to: "/admin/reviews", label: "Reviews", end: false },
];

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    "rounded-lg px-3 py-2 text-sm font-medium transition",
    isActive ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white",
  ].join(" ");
}

export function AdminLayout() {
  const { admin, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/admin" className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold"
              aria-hidden="true"
            >
              C
            </span>
            <span className="font-extrabold tracking-tight">
              CoursePulse <span className="font-medium text-slate-400">Admin</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Admin">
            {ADMIN_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link to="/" className="text-sm text-slate-300 hover:text-white hover:underline">
              View site ↗
            </Link>
            {admin && (
              <span className="hidden text-sm text-slate-400 sm:inline" title={admin.email}>
                {admin.email}
              </span>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
