/** Gate for /admin/* routes: redirects to the login page when signed out. */
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/authContext";
import { Spinner } from "./ui/Spinner";

export function ProtectedRoute() {
  const { isAuthenticated, initialising } = useAuth();
  const location = useLocation();

  // Avoid a redirect flash while a stored token is being validated.
  if (initialising) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status">
        <Spinner className="h-8 w-8 text-brand-600" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
