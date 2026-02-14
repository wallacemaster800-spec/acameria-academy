import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppNavbar } from "@/components/AppNavbar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, PlayCircle, FileText, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CoursePlayer() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<number>(0);

  // 🚀 COURSE
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

  // 🚀 MODULES + LESSONS
  const { data: modules } = useQuery({
    queryKey: ["modules", course?.id],
    enabled: !!course?.id,
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

  // 📦 memo lessons list
  const allLessons = useMemo(
    () => modules?.flatMap((m) => m.lessons) ?? [],
    [modules]
  );

  // 🚀 PROGRESS (solo cuando lessons existen)
  const { data: progress } = useQuery({
    queryKey: ["progress", user?.id, course?.id],
    enabled: !!user && allLessons.length > 0,
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

  // 🎯 initial lesson
  useEffect(() => {
    if (allLessons.length && !activeLessonId) {
      setActiveLessonId(allLessons[0].id);
    }
  }, [allLessons, activeLessonId]);

  const activeLesson = allLessons.find((l) => l.id === activeLessonId);
  const currentIndex = allLessons.findIndex((l) => l.id === activeLessonId);

  // 🚀 MUTATION
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

  // 🧠 throttle guardado cada 10s reales
  const handleTimeUpdate = useCallback(
    (time: number) => {
      if (!activeLessonId || !user) return;

      if (time - lastSavedRef.current >= 10) {
        lastSavedRef.current = time;
        saveProgress.mutate({ lessonId: activeLessonId, position: time });
      }
    },
    [activeLessonId, user, saveProgress]
  );

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
          } else {
            toast.success("Course completed! 🎉");
          }
        },
      }
    );
  }, [activeLessonId, user, currentIndex, allLessons, saveProgress, queryClient]);

  useEffect(() => () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
  }, []);

  if (courseLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <div className="mx-auto max-w-7xl p-4">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="aspect-video w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />

      <div className="mx-auto max-w-7xl px-4 py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-3">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1 lg:w-[70%]">
            {activeLesson?.video_url_hls ? (
              <VideoPlayer
                src={activeLesson.video_url_hls}
                watermarkEmail={profile?.email}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                initialTime={progress?.[activeLessonId!]?.last_watched_position ?? 0}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-lg bg-card border border-border">
                <p className="text-muted-foreground">No video available</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full rounded-lg border border-border bg-card p-4 lg:w-[30%]">
            <h3 className="font-semibold text-foreground">{course?.title}</h3>
          </aside>
        </div>
      </div>
    </div>
  );
}
