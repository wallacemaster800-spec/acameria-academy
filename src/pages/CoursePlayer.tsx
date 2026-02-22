import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppNavbar } from "@/components/AppNavbar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayCircle, ChevronLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DotGrid from "@/components/DotGrid";

export default function CoursePlayer() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<number>(0);

  const [hasAccess, setHasAccess] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [sending, setSending] = useState(false);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user || !course?.id) return;
      const { data: access } = await supabase
        .from("user_courses")
        .select("id, expires_at")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle();

      if (access) {
        const now = new Date();
        const expirationDate = new Date(access.expires_at);
        if (now > expirationDate) {
          setIsExpired(true);
          setHasAccess(false);
        } else {
          setIsExpired(false);
          setHasAccess(true);
        }
        setCheckingAccess(false);
        return;
      }

      const { data: req } = await supabase
        .from("course_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .eq("status", "pending")
        .maybeSingle();

      if (req) setAlreadyRequested(true);
      setHasAccess(false);
      setCheckingAccess(false);
    };

    if (course?.id) {
      checkUserAccess();
    }
  }, [course?.id, user]);

  const requestAccess = async () => {
    if (!user || !course?.id) return;
    setSending(true);
    const { error } = await supabase
      .from("course_requests")
      .insert({
        user_id: user.id,
        course_id: course.id,
        status: "pending"
      });
    setSending(false);
    if (!error) {
      setAlreadyRequested(true);
      setIsExpired(false);
    }
  };

  const { data: modules } = useQuery({
    queryKey: ["modules", course?.id],
    enabled: !!course?.id && hasAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*, lessons(*)")
        .eq("course_id", course!.id)
        .order("order_index")
        .order("order_index", { referencedTable: "lessons" });
      if (error) throw error;
      return data;
    },
  });

  const allLessons = useMemo(() => modules?.flatMap((m) => m.lessons) ?? [], [modules]);

  const { data: progress } = useQuery({
    queryKey: ["progress", user?.id, course?.id],
    enabled: !!user && allLessons.length > 0 && hasAccess,
    queryFn: async () => {
      const lessonIds = allLessons.map((l) => l.id);
      const { data } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user!.id)
        .in("lesson_id", lessonIds);
      const map: Record<string, { is_completed: boolean; last_watched_position: number }> = {};
      data?.forEach((p) => { map[p.lesson_id] = p; });
      return map;
    },
  });

  useEffect(() => {
    if (allLessons.length && !activeLessonId && hasAccess) {
      setActiveLessonId(allLessons[0].id);
    }
  }, [allLessons, activeLessonId, hasAccess]);

  const activeLesson = allLessons.find((l) => l.id === activeLessonId);
  const currentIndex = allLessons.findIndex((l) => l.id === activeLessonId);

  const saveProgress = useMutation({
    mutationFn: async ({ lessonId, position, completed }: { lessonId: string; position: number; completed?: boolean }) => {
      const { error } = await supabase.from("user_progress").upsert({
        user_id: user!.id,
        lesson_id: lessonId,
        last_watched_position: Math.floor(position),
        is_completed: completed ?? false,
      }, { onConflict: "user_id,lesson_id" });
      if (error) throw error;
    },
  });

  const handleTimeUpdate = useCallback((time: number) => {
    if (!activeLessonId || !user) return;
    if (time - lastSavedRef.current >= 10) {
      lastSavedRef.current = time;
      saveProgress.mutate({ lessonId: activeLessonId, position: time });
    }
  }, [activeLessonId, user, saveProgress]);

  const handleVideoEnded = useCallback(() => {
    if (!activeLessonId || !user) return;
    saveProgress.mutate(
      { lessonId: activeLessonId, position: 0, completed: true },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["progress"] });
          const next = allLessons[currentIndex + 1];
          if (next) {
            toast("Lesson complete!", {
              description: `Next: ${next.title} — auto-advancing in 5s`,
              action: { label: "Go Now", onClick: () => {
                clearTimeout(autoAdvanceTimer.current!);
                setActiveLessonId(next.id);
              }},
            });
            autoAdvanceTimer.current = setTimeout(() => setActiveLessonId(next.id), 5000);
          }
        },
      }
    );
  }, [activeLessonId, user, currentIndex, allLessons, saveProgress, queryClient]);

  if (courseLoading || checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppNavbar />
        <div className="mx-auto max-w-7xl p-8 w-full"><Skeleton className="aspect-video w-full rounded-xl" /></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col relative overflow-hidden">
        <DotGrid dotSize={4} gap={16} baseColor="#1a1425" activeColor="#7c3aed" proximity={150} />
        <AppNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
          <div className="text-center space-y-6 max-w-md w-full bg-white/10 backdrop-blur-xl p-10 rounded-2xl border border-white/20 shadow-2xl">
            {isExpired ? (
              <div className="space-y-4">
                <div className="flex justify-center"><AlertCircle className="w-16 h-16 text-red-400" /></div>
                <h2 className="text-2xl font-bold text-white">Tu acceso ha vencido</h2>
                <p className="text-gray-200">La fecha de tu suscripción para este curso finalizó.</p>
                <button onClick={requestAccess} disabled={sending} className="bg-red-600 hover:bg-red-500 text-white w-full px-8 py-4 rounded-xl text-lg font-bold shadow-lg transition-all active:scale-95">
                  {sending ? "Enviando solicitud..." : "Solicitar Renovación"}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Necesitas acceso para ver este curso</h2>
                {alreadyRequested ? (
                  <div className="bg-green-500/20 text-green-300 p-5 rounded-xl font-bold border border-green-500/30">
                    ✅ Solicitud enviada — espera la aprobación.
                  </div>
                ) : (
                  <button onClick={requestAccess} disabled={sending} className="bg-yellow-500 hover:bg-yellow-400 text-black w-full px-8 py-4 rounded-xl text-lg font-bold shadow-lg transition-all active:scale-95">
                    {sending ? "Enviando solicitud..." : "Solicitar acceso"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d12] relative flex flex-col overflow-hidden">
      <DotGrid dotSize={3} gap={18} baseColor="#23232b" activeColor="#7c3aed" proximity={130} shockRadius={220} />
      
      <div className="relative z-10 flex flex-col flex-1">
        <AppNavbar />
        <div className="mx-auto max-w-7xl px-4 py-6 w-full">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4 text-white hover:bg-white/20 hover:text-white">
            <ChevronLeft className="mr-1 h-4 w-4" /> Volver al Dashboard
          </Button>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* ÁREA DEL VIDEO */}
            <div className="flex-1 lg:w-[68%]">
              {activeLesson?.video_url_hls ? (
                <div className="rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/20 bg-black">
                  <VideoPlayer
                    src={activeLesson.video_url_hls}
                    watermarkEmail={profile?.email}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleVideoEnded}
                    initialTime={progress?.[activeLessonId!]?.last_watched_position ?? 0}
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                  <p className="text-white/40 italic">Video no disponible por el momento</p>
                </div>
              )}
              
              {/* TÍTULO DE LA CLASE */}
              <div className="mt-6 p-7 border border-white/20 rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl">
                <h2 className="text-3xl font-black text-white tracking-tight leading-none">{activeLesson?.title}</h2>
              </div>
            </div>

            {/* LISTA DE LECCIONES */}
            <aside className="w-full rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5 lg:w-[32%] shadow-2xl flex flex-col">
              <h3 className="font-black text-white mb-5 border-b border-white/20 pb-3 text-xl uppercase tracking-tighter italic">
                {course?.title}
              </h3>
              
              <div className="space-y-2 overflow-y-auto max-h-[65vh] pr-2 custom-scrollbar">
                {modules?.map((m) => (
                  <div key={m.id} className="mb-6">
                    <p className="font-black text-[11px] text-purple-300 uppercase tracking-[0.2em] mb-3 px-2">
                      {m.title}
                    </p>
                    <div className="space-y-1">
                      {m.lessons.map((l: any) => (
                        <button 
                          key={l.id} 
                          onClick={() => setActiveLessonId(l.id)}
                          className={cn(
                            "w-full text-left p-4 rounded-xl transition-all flex items-center gap-4 text-sm group",
                            activeLessonId === l.id 
                              ? "bg-purple-600/40 text-white border border-purple-400/50 shadow-lg" 
                              : "hover:bg-white/10 text-gray-200 hover:text-white border border-transparent"
                          )}
                        >
                          <PlayCircle className={cn(
                            "w-5 h-5 shrink-0 transition-transform group-hover:scale-110", 
                            activeLessonId === l.id ? "text-purple-300" : "text-gray-400"
                          )} />
                          <span className="truncate font-medium">{l.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}