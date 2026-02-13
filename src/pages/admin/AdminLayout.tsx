import { NavLink, Outlet } from "react-router-dom";
import { AppNavbar } from "@/components/AppNavbar";
import { Users, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:block">
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
