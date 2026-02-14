import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth } from "@/components/RequireAuth";
import { AuthProvider } from "@/components/AuthProvider";

// 🔥 Lazy loading de páginas (code splitting)
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CoursePlayer = lazy(() => import("./pages/CoursePlayer"));
const SubscriptionExpired = lazy(() => import("./pages/SubscriptionExpired"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const StudentsPage = lazy(() => import("./pages/admin/StudentsPage"));
const CoursesPage = lazy(() => import("./pages/admin/CoursesPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// 🌀 Loader reutilizable
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

// 🚀 CONFIGURACIÓN GLOBAL DE CACHE (React Query)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min sin refetch
      cacheTime: 1000 * 60 * 30, // cache 30 min
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Públicas */}
                <Route path="/login" element={<Login />} />
                <Route path="/subscription-expired" element={<SubscriptionExpired />} />

                {/* Redirect inicial */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Privadas */}
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

                {/* Admin */}
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
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

