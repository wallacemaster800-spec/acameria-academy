import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const { profile } = useAuth();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-foreground">Settings</h1>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-medium text-muted-foreground">Logged in as</h2>
        <p className="mt-1 text-foreground">{profile?.email}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Platform settings and configuration options will appear here.
        </p>
      </div>
    </div>
  );
}
