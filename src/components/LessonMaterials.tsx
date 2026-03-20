import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LessonMaterialsProps = {
  lessonId: string | null;
};

type LessonResource = Tables<"lesson_resources">;

function safeErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Ocurrió un error inesperado.";
}

// Helper para extraer el video ID.
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.includes("/embed/")) return u.pathname.split("/embed/")[1];
      return u.searchParams.get("v");
    }
  } catch {}
  return null;
}

export function LessonMaterials({ lessonId }: LessonMaterialsProps) {
  const queryKey = useMemo(() => ["lesson-resources", lessonId] as const, [lessonId]);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey,
    enabled: !!lessonId,
    queryFn: async () => {
      if (!lessonId) return [] as LessonResource[];
      const { data: resources, error: qError } = await supabase
        .from("lesson_resources")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: true });

      if (qError) throw qError;
      return (resources ?? []) as LessonResource[];
    },
  });

  const resources = data ?? [];
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Si no hay lessonId o no hay recursos, no renderizamos nada.
  if (!lessonId) return null;
  if (!isLoading && !isError && resources.length === 0) return null;

  const pdfResources = resources.filter((r) => r.type === "pdf");
  const youtubeResources = resources.filter((r) => r.type === "youtube");
  const snippetResources = resources.filter((r) => r.type === "snippet");

  const hasPdf = pdfResources.length > 0;
  const hasYoutube = youtubeResources.length > 0;
  const hasSnippet = snippetResources.length > 0;

  if (isLoading) {
    return (
      <div className="mt-6 p-7 border border-white/20 rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-black text-white mb-5">Material complementario</h3>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-1/2 bg-white/10" />
          <Skeleton className="h-64 w-full bg-white/10" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-6 p-7 border border-white/20 rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl">
        <h3 className="text-xl font-black text-white mb-5">Material complementario</h3>
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
          <p className="text-red-200 font-bold">No se pudieron cargar los materiales.</p>
          <p className="text-red-100/80 text-sm mt-1">{safeErrorMessage(error)}</p>
        </div>
      </div>
    );
  }

  // Tabs: SOLO los que existen.
  const firstTabValue = hasPdf ? "pdf" : hasYoutube ? "youtube" : hasSnippet ? "snippet" : "pdf";

  return (
    <div className="mt-6 p-7 border border-white/20 rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl">
      <h3 className="text-xl font-black text-white mb-5">Material complementario</h3>

      <Tabs defaultValue={firstTabValue} className="w-full">
        <TabsList className="bg-white/10 border border-white/20">
          {hasPdf ? (
            <TabsTrigger
              value="pdf"
              className="data-[state=active]:bg-purple-600/50 data-[state=active]:text-white"
            >
              📄 Material
            </TabsTrigger>
          ) : null}
          {hasYoutube ? (
            <TabsTrigger
              value="youtube"
              className="data-[state=active]:bg-purple-600/50 data-[state=active]:text-white"
            >
              🎬 Videos Adicionales
            </TabsTrigger>
          ) : null}
          {hasSnippet ? (
            <TabsTrigger
              value="snippet"
              className="data-[state=active]:bg-purple-600/50 data-[state=active]:text-white"
            >
              💻 Código
            </TabsTrigger>
          ) : null}
        </TabsList>

        {hasPdf ? (
          <TabsContent value="pdf">
            <div className="mt-4 space-y-4">
              {pdfResources.map((resource) =>
                resource.url ? (
                  <iframe
                    key={resource.id}
                    src={resource.url}
                    style={{ height: "600px" }}
                    className="w-full rounded-lg border border-white/10"
                    title={resource.title}
                  />
                ) : null
              )}
            </div>
          </TabsContent>
        ) : null}

        {hasYoutube ? (
          <TabsContent value="youtube">
            <div className="mt-4 space-y-4">
              {youtubeResources.map((resource) => {
                if (!resource.url) return null;
                const videoId = extractYouTubeId(resource.url);
                if (!videoId) return null;
                return (
                  <iframe
                    key={resource.id}
                    src={`https://www.youtube.com/embed/${videoId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full aspect-video rounded-lg border border-white/10"
                    title={resource.title}
                  />
                );
              })}
            </div>
          </TabsContent>
        ) : null}

        {hasSnippet ? (
          <TabsContent value="snippet">
            <div className="mt-4 space-y-6">
              {snippetResources.map((resource, idx) => (
                <div key={resource.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <p className="text-white font-bold">{resource.title}</p>
                      {resource.language ? (
                        <Badge className="bg-purple-600/30 text-purple-300 font-mono border border-purple-400/20">
                          {resource.language}
                        </Badge>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={async () => {
                        if (!resource.content) return;
                        try {
                          await navigator.clipboard.writeText(resource.content);
                          setCopiedIndex(idx);
                          window.setTimeout(() => setCopiedIndex(null), 2000);
                        } catch {
                          // Si no se puede copiar, no interrumpimos el resto.
                        }
                      }}
                    >
                      {copiedIndex === idx ? "¡Copiado!" : "Copiar"}
                    </Button>
                  </div>

                  <pre className="bg-black/60 text-green-300 font-mono p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {resource.content ?? ""}
                  </pre>
                </div>
              ))}
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

