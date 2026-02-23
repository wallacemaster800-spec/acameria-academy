import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";

interface CoursePreview {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

export default function StudentsPage() {
  const nav = useNavigate();

  const { data: courses, isLoading, isError } = useQuery({
    // ✅ FIX: key separada — antes usaba "admin-courses" igual que CoursesPage,
    // pero con un select distinto. React Query devolvía los datos cacheados del
    // primero que cargara, así que uno de los dos componentes siempre veía datos
    // incorrectos (sin módulos, o con módulos cuando no los necesitaba).
    queryKey: ["admin-courses-preview"],
    queryFn: async (): Promise<CoursePreview[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, thumbnail_url")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-6 text-foreground">Cursos</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ✅ FIX: estado de error — antes no se manejaba
  if (isError) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-6 text-foreground">Cursos</h1>
        <p className="text-sm text-destructive">
          Error al cargar los cursos. Intentá de nuevo.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6 text-foreground">Estudiantes por Curso</h1>

      {courses?.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <BookOpen className="mb-3 h-10 w-10" />
          <p>No hay cursos creados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {courses?.map((c) => (
            <div
              key={c.id}
              onClick={() => nav(`/admin/course/${c.id}`)}
              className="border border-border rounded-lg p-4 cursor-pointer hover:bg-muted transition-colors bg-card"
            >
              {c.thumbnail_url && (
                // ✅ FIX: alt descriptivo — antes faltaba accesibilidad
                <img
                  src={c.thumbnail_url}
                  alt={`Miniatura de ${c.title}`}
                  className="mb-2 rounded w-full object-cover aspect-video"
                />
              )}
              <div className="font-semibold text-foreground text-sm">{c.title}</div>
              <div className="text-xs text-muted-foreground mt-1">Ver estudiantes →</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}