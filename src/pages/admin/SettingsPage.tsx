import { useAuthContext } from "@/components/AuthProvider"; // ✅ FIX: contexto global

export default function SettingsPage() {
  const { profile } = useAuthContext(); // ✅ FIX: era useAuth() directo

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-foreground">Ajustes</h1>
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Sesión activa</h2>
          <p className="mt-1 text-foreground font-medium">{profile?.email}</p>
          {profile?.full_name && (
            <p className="text-sm text-muted-foreground">{profile.full_name}</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground border-t border-border pt-4">
          Las opciones de configuración de plataforma aparecerán aquí.
        </p>
      </div>
    </div>
  );
}