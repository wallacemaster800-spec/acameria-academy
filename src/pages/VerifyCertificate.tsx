import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Aurora from "@/components/Aurora";
import MagicBento from "@/components/MagicBento";
import "@/components/MagicBento.css";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type CertificateEmission = {
  courseTitle: string;
  emissionDate: string;
  verifiedCode: string;
};

type CertificatesRow = Tables<"certificates">;

type CourseRow = Tables<"courses">;
type ProfileRow = Tables<"profiles">;

function formatDateEs(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "2-digit" });
}

export default function VerifyCertificate() {
  const params = useParams<{ code: string }>();
  const code = params.code ?? "";

  const normalizedCode = useMemo(() => code.trim().toUpperCase(), [code]);

  const { data, isLoading } = useQuery({
    queryKey: ["verify-certificate", normalizedCode],
    enabled: normalizedCode.length > 0,
    queryFn: async (): Promise<CertificateEmission | null> => {
      // Busca el certificado por inicio del UUID (primeros 8 chars)
      const { data: certRows, error: certError } = await supabase
        .from("certificates")
        .select("id, created_at, user_id, course_id")
        .ilike("id", `${normalizedCode}%`)
        .limit(1);

      if (certError) throw certError;
      const cert = certRows?.[0] as CertificatesRow | undefined;
      if (!cert) return null;

      const [{ data: course, error: courseError }, { data: profile, error: profileError }] =
        await Promise.all([
          supabase.from("courses").select("title").eq("id", cert.course_id).single(),
          supabase.from("profiles").select("email").eq("id", cert.user_id).single(),
        ]);

      if (courseError) throw courseError;
      if (profileError) throw profileError;

      const courseData = course as CourseRow | null;
      const profileData = profile as ProfileRow | null;

      // (Se obtiene email por requerimiento; no se muestra en la card para mantenerla simple.)
      void profileData;

      const verifiedCode = cert.id.slice(0, 8).toUpperCase();

      if (!courseData?.title) return null;

      return {
        courseTitle: courseData.title,
        emissionDate: cert.created_at,
        verifiedCode,
      };
    },
  });

  return (
    <div className="min-h-screen bg-[#060010] relative overflow-hidden">
      <Aurora colorStops={["#07b632", "#ae14f5", "#5227FF"]} blend={0.46} amplitude={1.0} speed={0.5} />
      <MagicBento glowColor="132, 0, 255" spotlightRadius={420}>
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-2xl">
            {isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-xl shadow-2xl">
                <Skeleton className="h-10 w-3/4 bg-white/10 rounded-xl" />
                <div className="mt-5 space-y-3">
                  <Skeleton className="h-5 w-full bg-white/10" />
                  <Skeleton className="h-5 w-2/3 bg-white/10" />
                  <Skeleton className="h-5 w-1/2 bg-white/10" />
                </div>
              </div>
            ) : data ? (
              <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-7 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-2xl font-black text-white">✅ Certificado Válido</p>
                    <p className="text-purple-300/80 text-xs uppercase tracking-[0.2em] font-black mt-2">
                      Curso
                    </p>
                    <p className="text-white font-bold text-xl mt-2">{data.courseTitle}</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="text-white/80 text-sm">
                    Fecha de emisión:{" "}
                    <span className="text-white font-bold">{formatDateEs(data.emissionDate)}</span>
                  </p>
                  <p className="text-white/80 text-sm mt-2">
                    Código verificado:{" "}
                    <span className="text-purple-300 font-mono font-bold">{data.verifiedCode}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 backdrop-blur-xl p-7 shadow-2xl">
                <p className="text-xl font-black text-red-200">❌ Certificado no encontrado o inválido</p>
                <p className="text-white/70 text-sm mt-2">
                  Revisá que el código tenga 8 caracteres e intentá de nuevo.
                </p>
              </div>
            )}
          </div>
        </div>
      </MagicBento>
    </div>
  );
}

