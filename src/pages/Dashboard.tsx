import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppNavbar } from "@/components/AppNavbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: progressMap } = useQuery({
    queryKey: ["all-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_progress")
        .select("lesson_id, is_completed")
        .eq("user_id", user!.id);
      const map: Record<string, boolean> = {};
      data?.forEach((p) => { map[p.lesson_id] = p.is_completed; });
      return map;
    },
  });

  const { data: lessonCounts } = useQuery({
    queryKey: ["lesson-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lessons")
        .select("id, module_id, modules!inner(course_id)");
      const counts: Record<string, string[]> = {};
      data?.forEach((l: any) => {
        const cid = l.modules.course_id;
        if (!counts[cid]) counts[cid] = [];
        counts[cid].push(l.id);
      });
      return counts;
    },
  });

  const getProgress = (courseId: string) => {
    if (!lessonCounts?.[courseId] || !progressMap) return 0;
    const lessons = lessonCounts[courseId];
    const completed = lessons.filter((lid) => progressMap[lid]).length;
    return lessons.length > 0 ? Math.round((completed / lessons.length) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Your Courses</h1>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : courses?.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-muted-foreground">
            <BookOpen className="mb-3 h-12 w-12" />
            <p>No courses available yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses?.map((course) => {
              const progress = getProgress(course.id);
              return (
                <Link
                  key={course.id}
                  to={`/course/${course.slug}/learn`}
                  className="group overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="aspect-video w-full bg-secondary">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
                    {progress > 0 && (
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
