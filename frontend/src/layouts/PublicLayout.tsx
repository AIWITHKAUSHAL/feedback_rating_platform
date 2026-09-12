/** Layout for the student-facing pages. */
import { Outlet } from "react-router-dom";

import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Keyboard users can jump straight past the navigation. */}
      <a
        href="#main"
        className="sr-only-focusable absolute left-4 top-4 z-50 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
