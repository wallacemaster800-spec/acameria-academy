<<<<<<< HEAD
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface RequireAuthProps {
=======
import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/components/AuthProvider";

interface Props {
>>>>>>> 29c90d1 (primer commit)
  children: React.ReactNode;
  requireAdmin?: boolean;
}

<<<<<<< HEAD
export function RequireAuth({ children, requireAdmin = false }: RequireAuthProps) {
  const { user, profile, isAdmin, loading } = useAuth();
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

  // Check expiration for non-admins
  if (!isAdmin && profile?.access_expires_at) {
    const expired = new Date(profile.access_expires_at) < new Date();
    if (expired) {
      return <Navigate to="/subscription-expired" replace />;
    }
=======
export function RequireAuth({ children, requireAdmin }: Props) {
  const { user, loading, isAdmin, profile } = useAuthContext();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
>>>>>>> 29c90d1 (primer commit)
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

<<<<<<< HEAD
=======
  if (profile?.access_expires_at) {
    const expires = new Date(profile.access_expires_at);
    if (expires < new Date()) {
      return <Navigate to="/subscription-expired" replace />;
    }
  }

>>>>>>> 29c90d1 (primer commit)
  return <>{children}</>;
}
