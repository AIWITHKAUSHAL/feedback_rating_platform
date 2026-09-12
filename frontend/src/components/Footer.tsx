/** Site footer. */
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-bold text-slate-900">CoursePulse</p>
          <p className="mt-1">
            Course feedback and rating platform · React · FastAPI · PostgreSQL · AWS
          </p>
        </div>
        <nav className="flex gap-4" aria-label="Footer">
          <Link to="/" className="hover:text-brand-700 hover:underline">
            Courses
          </Link>
          <Link to="/admin" className="hover:text-brand-700 hover:underline">
            Admin
          </Link>
          <a href="/docs" className="hover:text-brand-700 hover:underline">
            API docs
          </a>
        </nav>
      </div>
    </footer>
  );
}
