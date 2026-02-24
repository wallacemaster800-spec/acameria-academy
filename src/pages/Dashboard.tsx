import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppNavbar } from "@/components/AppNavbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/components/AuthProvider";
import { differenceInDays } from "date-fns";
import Aurora from "@/components/Aurora";
import MagicBento from "@/components/MagicBento";
import "@/components/MagicBento.css";

export default function Dashboard() {
  const { profile, user } = useAuthContext();

  const daysLeft =
    profile?.access_expires_at
      ? differenceInDays(new Date(profile.access_expires_at), new Date())
      : null;

  const displayName = profile?.full_name?.trim() || profile?.email || user?.email || "";
  const firstName = displayName.includes(" ")
    ? displayName.split(" ")[0]
    : displayName.split("@")[0];

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("is_published", true);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-[#060010] relative overflow-hidden">
      <Aurora colorStops={["#07b632", "#ae14f5", "#5227FF"]} blend={0.46} amplitude={1.0} speed={0.5} />
      <MagicBento glowColor="132, 0, 255" spotlightRadius={400}>
        <div className="relative z-10 min-h-screen">
          <AppNavbar />
          <main className="mx-auto max-w-7xl px-4 py-8">

            <div className="mb-8">
              <p className="text-purple-300/50 text-xs uppercase tracking-[0.3em] font-bold mb-1">
                Bienvenido
              </p>
              <h1 className="text-3xl font-black text-white tracking-tight">
                {firstName ? `¡Hola, ${firstName}!` : "Tu Academia"}
              </h1>
              {(profile?.email || user?.email) && (
                <p className="text-gray-500 text-sm mt-1">
                  {profile?.email || user?.email}
                </p>
              )}
              {daysLeft !== null && (
                <p className="mt-2 text-xs text-purple-300/60 uppercase tracking-widest font-medium">
                  Suscripción:{" "}
                  {daysLeft > 0 ? `${daysLeft} días restantes` : "Expirada"}
                </p>
              )}
            </div>

            <h2 className="mb-6 text-xl font-bold text-white/70 tracking-tight">
              Tus cursos disponibles
            </h2>

            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64 rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <p className="text-gray-500 text-sm">No hay cursos disponibles por el momento.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((c) => (
                  <Link
                    key={c.id}
                    to={`/course/${c.slug}/learn`}
                    className="magic-bento-card magic-bento-card--border-glow group flex flex-col p-0 transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: "rgba(6, 0, 16, 0.7)" } as any}
                  >
                    <div className="aspect-video bg-white/5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#060010] to-transparent opacity-60" />
                    </div>
                    <div className="p-6 relative z-10">
                      <h3 className="font-bold text-xl text-white group-hover:text-purple-400 transition-colors">
                        {c.title}
                      </h3>
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                      <div className="mt-6 flex items-center text-xs font-bold text-purple-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Continuar aprendiendo →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </MagicBento>
    </div>
  );
}