import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppNavbar } from "@/components/AppNavbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/components/AuthProvider"; // ✅ FIX: contexto global
import { differenceInDays } from "date-fns";
import Aurora from "@/components/Aurora";
import MagicBento from "@/components/MagicBento";
import "@/components/MagicBento.css";

export default function Dashboard() {
  const { profile } = useAuthContext(); // ✅ FIX

  // ✅ FIX: se eliminó el useEffect de expiración — RequireAuth ya lo maneja.
  // Tenerlo duplicado aquí causaba una navegación extra innecesaria.

  const daysLeft =
    profile?.access_expires_at
      ? differenceInDays(new Date(profile.access_expires_at), new Date())
      : null;

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
      <Aurora
        colorStops={["#07b632", "#ae14f5", "#5227FF"]}
        blend={0.46}
        amplitude={1.0}
        speed={0.5}
      />
      <MagicBento glowColor="132, 0, 255" spotlightRadius={400}>
        <div className="relative z-10 min-h-screen">
          <AppNavbar />
          <main className="mx-auto max-w-7xl px-4 py-8">
            <h1 className="mb-2 text-3xl font-bold text-white tracking-tight">
              Tus cursos
            </h1>
            {daysLeft !== null && (
              <p className="mb-8 text-sm text-purple-300/60 uppercase tracking-widest font-medium">
                Suscripción:{" "}
                {daysLeft > 0 ? `${daysLeft} días restantes` : "Expirada"}
              </p>
            )}
            {isLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-64 rounded-2xl bg-white/5" />
                ))}
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