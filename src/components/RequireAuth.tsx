import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/components/AuthProvider";
import { Loader2 } from "lucide-react";

interface RequireAuthProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function RequireAuth({ children, requireAdmin = false }: RequireAuthProps) {
  const { user, profile, isAdmin, loading } = useAuthContext(); // 🔥 USAR CONTEXTO
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin guard
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Expiración suscripción
  if (!isAdmin && profile?.access_expires_at) {
    const expired = new Date(profile.access_expires_at) < new Date();
    if (expired) {
      return <Navigate to="/subscription-expired" replace />;
    }
  }

  return <>{children}</>;
}


