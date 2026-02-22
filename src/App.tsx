import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App(){
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <BrowserRouter>
            <Suspense fallback={<PageLoader/>}>
              <Routes>

                {/* PUBLIC */}
                <Route path="/login" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="/subscription-expired" element={<SubscriptionExpired/>}/>
                <Route path="/" element={<Navigate to="/dashboard" replace/>}/>

                {/* PRIVATE USER */}
                <Route path="/dashboard" element={
                  <RequireAuth>
                    <Dashboard/>
                  </RequireAuth>
                }/>

                <Route path="/course/:slug/learn" element={
                  <RequireAuth>
                    <CoursePlayer/>
                  </RequireAuth>
                }/>

                {/* ADMIN */}
                <Route path="/admin" element={
                  <RequireAuth requireAdmin>
                    <AdminLayout/>
                  </RequireAuth>
                }>

                  <Route index element={<Navigate to="students" replace/>}/>
                  <Route path="students" element={<StudentsPage/>}/>
                  <Route path="courses" element={<CoursesPage/>}/>
                  <Route path="settings" element={<SettingsPage/>}/>

                  {/* ⭐ ESTA ES LA RUTA QUE FALTABA */}
                  <Route path="course/:id" element={<AdminCourseStudents/>}/>

                </Route>

                <Route path="*" element={<NotFound/>}/>

              </Routes>
            </Suspense>
          </BrowserRouter>

        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}