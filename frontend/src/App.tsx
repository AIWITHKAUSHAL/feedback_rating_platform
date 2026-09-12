/** Application routes. */
import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./layouts/AdminLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminCoursesPage } from "./pages/admin/AdminCoursesPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminReviewsPage } from "./pages/admin/AdminReviewsPage";

export function App() {
  return (
    <Routes>
      {/* Public, student facing */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin sign in sits outside the protected layout */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Everything below requires a valid admin token */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/courses" element={<AdminCoursesPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
