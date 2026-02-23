import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { AppNavbar } from "@/components/AppNavbar";
import { Users, BookOpen, Settings, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin/students", label: "Estudiantes", icon: Users },
  { to: "/admin/courses", label: "Cursos", icon: BookOpen },
  { to: "/admin/settings", label: "Ajustes", icon: Settings },
];

export default function AdminLayout() {
  // ✅ FIX: estado para menu mobile — antes el sidebar era invisible en móvil
  // y el usuario quedaba sin navegación
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavItems = () => (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />

      {/* ✅ Botón hamburguesa visible solo en móvil */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 md:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
          aria-label="Abrir menú"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="text-sm font-medium text-foreground">Admin</span>
      </div>

      {/* ✅ Menu mobile desplegable */}
      {mobileOpen && (
        <div className="border-b border-border bg-card md:hidden">
          <NavItems />
        </div>
      )}

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:block">
          <NavItems />
        </aside>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}