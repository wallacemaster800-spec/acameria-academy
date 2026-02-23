import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth } from "@/components/RequireAuth";
import { AuthProvider } from "@/components/AuthProvider";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CoursePlayer = lazy(() => import("./pages/CoursePlayer"));
const SubscriptionExpired = lazy(() => import("./pages/SubscriptionExpired"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const StudentsPage = lazy(() => import("./pages/admin/StudentsPage"));
const CoursesPage = lazy(() => import("./pages/admin/CoursesPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const AdminCourseStudents = lazy(() => import("./pages/admin/AdminCourseStudents"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

// queryClient fuera del componente para evitar re-creación en cada render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 min: datos frescos sin refetch
      gcTime: 1000 * 60 * 30,         // 30 min: tiempo en caché (era cacheTime, deprecado en v5)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/*
          ✅ FIX CRÍTICO: BrowserRouter debe envolver AuthProvider.
          Si useAuth usa useNavigate/useLocation internamente, necesita
          estar dentro del Router. Antes estaba al revés y rompía silenciosamente.
        */}
        <BrowserRouter>
          <AuthProvider>
            {/* ✅ FIX: Se eliminó el <Toaster> de shadcn duplicado. Solo Sonner. */}
            <Toaster richColors closeButton />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* PUBLIC */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/subscription-expired" element={<SubscriptionExpired />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* PRIVATE USER */}
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth>
                      <Dashboard />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/course/:slug/learn"
                  element={
                    <RequireAuth>
                      <CoursePlayer />
                    </RequireAuth>
                  }
                />

                {/* ADMIN */}
                <Route
                  path="/admin"
                  element={
                    <RequireAuth requireAdmin>
                      <AdminLayout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<Navigate to="students" replace />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="courses" element={<CoursesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="course/:id" element={<AdminCourseStudents />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
