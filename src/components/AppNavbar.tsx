import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, LogOut, Shield } from "lucide-react";
import { memo } from "react";

export const AppNavbar = memo(function AppNavbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2 text-primary font-bold text-lg">
          <GraduationCap className="h-5 w-5" />
          Acameria
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <LayoutDashboard className="mr-1.5 h-4 w-4" /> Courses
            </Link>
          </Button>

          {isAdmin && (
            <Button variant="ghost" size="sm" asChild className="text-primary">
              <Link to="/admin">
                <Shield className="mr-1.5 h-4 w-4" /> Admin
              </Link>
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
});

