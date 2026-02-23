import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/components/AuthProvider";
import { Loader2 } from "lucide-react";

interface RequireAuthProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function RequireAuth({ children, requireAdmin = false }: RequireAuthProps) {
  const { user, profile, isAdmin, loading } = useAuthContext();
  const location = useLocation();

  // Esperar a que auth y perfil terminen de cargar
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sin sesión → login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Guard de admin
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // ✅ FIX: Antes, si profile era null (aún no cargado), el check se
  // saltaba silenciosamente y el usuario accedía sin validar suscripción.
  // Ahora: si el usuario no es admin y el perfil todavía no llegó, esperamos.
  if (!isAdmin && profile === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check de expiración de suscripción (solo usuarios no-admin)
  if (!isAdmin && profile?.access_expires_at) {
    const expired = new Date(profile.access_expires_at) < new Date();
    if (expired) {
      return <Navigate to="/subscription-expired" replace />;
    }
  }

  return <>{children}</>;
}
