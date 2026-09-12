/** Site header with brand, navigation, catalogue search and a mobile menu. */
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Courses", end: true },
  { to: "/?sort=rating_desc&min_rating=4", label: "Top rated", end: false },
  { to: "/#categories", label: "Categories", end: false },
  { to: "/admin", label: "Admin", end: false },
];

function navClass({ isActive }: { isActive: boolean }): string {
  return [
    "rounded-lg px-3 py-2 text-sm font-medium transition",
    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const query = term.trim();
    navigate(query ? `/?search=${encodeURIComponent(query)}` : "/");
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="CoursePulse home">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white"
            aria-hidden="true"
          >
            C
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            Course<span className="text-brand-600">Pulse</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.label} to={link.to} end={link.end} className={navClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <form
          className="hidden lg:block"
          role="search"
          aria-label="Search courses"
          onSubmit={handleSearch}
        >
          <label className="sr-only" htmlFor="header-search">
            Search courses
          </label>
          <input
            id="header-search"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search courses..."
            className="w-56 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm placeholder:text-slate-400 hover:border-slate-400"
          />
        </form>

        <button
          type="button"
          className="btn-ghost ml-auto md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <form role="search" aria-label="Search courses" onSubmit={handleSearch} className="mb-3">
            <label className="sr-only" htmlFor="mobile-search">
              Search courses
            </label>
            <input
              id="mobile-search"
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search courses..."
              className="field-input"
            />
          </form>
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.end}
                className={navClass}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
