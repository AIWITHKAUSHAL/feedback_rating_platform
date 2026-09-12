/** 404 page for unknown client-side routes. */
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="card mx-auto max-w-lg px-6 py-16 text-center">
      <p className="text-5xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-3 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/" className="btn-primary mt-6 inline-flex">
        Back to courses
      </Link>
    </div>
  );
}
