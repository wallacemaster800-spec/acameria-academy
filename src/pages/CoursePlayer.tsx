import { useState, useEffect, useCallback, useRef } from "react";
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
  });

  const { data: modules } = useQuery({
    queryKey: ["modules", course?.id],
    enabled: !!course,
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

  const { data: progress } = useQuery({
    queryKey: ["progress", user?.id, course?.id],
    enabled: !!user && !!course,
    queryFn: async () => {
      const lessonIds = modules?.flatMap((m) => m.lessons.map((l) => l.id)) ?? [];
      if (lessonIds.length === 0) return {};
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

  // Set initial active lesson
  useEffect(() => {
    if (modules && !activeLessonId) {
      const firstLesson = modules[0]?.lessons?.[0];
      if (firstLesson) setActiveLessonId(firstLesson.id);
    }
  }, [modules, activeLessonId]);

  const activeLesson = modules?.flatMap((m) => m.lessons).find((l) => l.id === activeLessonId);

  const allLessons = modules?.flatMap((m) => m.lessons) ?? [];
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

  const handleTimeUpdate = useCallback(
    (time: number) => {
      if (!activeLessonId || !user) return;
      // Save every 10 seconds
      if (Math.floor(time) % 10 === 0) {
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
          queryClient.invalidateQueries({ queryKey: ["all-progress"] });
          const next = allLessons[currentIndex + 1];
          if (next) {
            toast("Lesson complete!", {
              description: `Next: ${next.title} — auto-advancing in 5s`,
              action: { label: "Go Now", onClick: () => { clearTimeout(autoAdvanceTimer.current!); setActiveLessonId(next.id); } },
            });
            autoAdvanceTimer.current = setTimeout(() => setActiveLessonId(next.id), 5000);
          } else {
            toast.success("Course completed! 🎉");
          }
        },
      }
    );
  }, [activeLessonId, user, currentIndex, allLessons, saveProgress, queryClient]);

  useEffect(() => () => { if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current); }, []);

  const completedCount = Object.values(progress ?? {}).filter((p) => p.is_completed).length;
  const totalLessons = allLessons.length;
  const overallProgress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

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
          {/* Video area */}
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
            {activeLesson && (
              <div className="mt-4">
                <h2 className="text-xl font-semibold text-foreground">{activeLesson.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{activeLesson.description}</p>
                {activeLesson.resources_url && (
                  <a href={activeLesson.resources_url} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <FileText className="h-4 w-4" /> Download Resources
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full rounded-lg border border-border bg-card p-4 lg:w-[30%]">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">{course?.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{overallProgress}% complete</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary transition-all" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>

            <Accordion type="multiple" defaultValue={modules?.map((m) => m.id)} className="space-y-1">
              {modules?.map((mod) => (
                <AccordionItem key={mod.id} value={mod.id} className="border-border">
                  <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-2">
                    {mod.title}
                  </AccordionTrigger>
                  <AccordionContent className="pb-1">
                    <ul className="space-y-0.5">
                      {mod.lessons.map((lesson) => {
                        const isActive = lesson.id === activeLessonId;
                        const isComplete = progress?.[lesson.id]?.is_completed;
                        return (
                          <li key={lesson.id}>
                            <button
                              onClick={() => setActiveLessonId(lesson.id)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors",
                                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                              )}
                            >
                              {isComplete ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                              ) : isActive ? (
                                <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                              ) : (
                                <Circle className="h-4 w-4 shrink-0" />
                              )}
                              <span className="truncate">{lesson.title}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </aside>
        </div>
      </div>
    </div>
  );
}
