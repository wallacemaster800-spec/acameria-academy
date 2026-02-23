import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, Loader2, BookOpen, Trash2, GripVertical } from "lucide-react";

export default function CoursesPage() {
  const queryClient = useQueryClient();

  const [courseDialog, setCourseDialog] = useState(false);
  const [moduleDialog, setModuleDialog] = useState<string | null>(null);
  const [lessonDialog, setLessonDialog] = useState<string | null>(null);
  // ✅ FIX: estado para confirmar borrado — acción destructiva necesita guard
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    thumbnail_url: "",
    slug: "",
  });
  const [moduleTitle, setModuleTitle] = useState("");
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    video_url_hls: "",
    resources_url: "",
  });

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, modules(*, lessons(*))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createCourse = useMutation({
    mutationFn: async () => {
      const slug =
        courseForm.slug ||
        courseForm.title
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase
        .from("courses")
        .insert({ ...courseForm, slug });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Curso creado");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setCourseDialog(false);
      setCourseForm({ title: "", description: "", thumbnail_url: "", slug: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("courses")
        .update({ is_published: published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-courses"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Curso eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setDeleteConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addModule = useMutation({
    mutationFn: async (courseId: string) => {
      const course = courses?.find((c) => c.id === courseId);
      const orderIndex = course?.modules?.length ?? 0;
      const { error } = await supabase
        .from("modules")
        .insert({ course_id: courseId, title: moduleTitle, order_index: orderIndex });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Módulo añadido");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setModuleDialog(null);
      setModuleTitle("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addLesson = useMutation({
    mutationFn: async (moduleId: string) => {
      const mod = courses?.flatMap((c) => c.modules).find((m) => m.id === moduleId);
      const orderIndex = mod?.lessons?.length ?? 0;
      const { error } = await supabase.from("lessons").insert({
        module_id: moduleId,
        title: lessonForm.title,
        description: lessonForm.description,
        video_url_hls: lessonForm.video_url_hls,
        resources_url: lessonForm.resources_url || null,
        order_index: orderIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lección añadida");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setLessonDialog(null);
      setLessonForm({ title: "", description: "", video_url_hls: "", resources_url: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Cursos</h1>
        <Button onClick={() => setCourseDialog(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Nuevo Curso
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : courses?.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <BookOpen className="mb-3 h-10 w-10" />
          <p>Sin cursos aún. Creá el primero.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses?.map((course) => (
            <div key={course.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">/{course.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`pub-${course.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      Publicado
                    </Label>
                    <Switch
                      id={`pub-${course.id}`}
                      checked={course.is_published}
                      onCheckedChange={(val) =>
                        togglePublish.mutate({ id: course.id, published: val })
                      }
                    />
                  </div>
                  {/* ✅ FIX: abre confirmación antes de borrar */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirm(course.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Módulos</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModuleDialog(course.id)}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Módulo
                  </Button>
                </div>
                {course.modules?.length > 0 && (
                  <Accordion type="multiple" className="space-y-1">
                    {course.modules
                      .sort((a: any, b: any) => a.order_index - b.order_index)
                      .map((mod: any) => (
                        <AccordionItem
                          key={mod.id}
                          value={mod.id}
                          className="border-border"
                        >
                          <AccordionTrigger className="py-2 text-sm hover:no-underline">
                            <span className="flex items-center gap-2">
                              <GripVertical className="h-3 w-3 text-muted-foreground" />
                              {mod.title}
                              {/* ✅ FIX: renombrado LessonCount para evitar colisión con shadcn Badge */}
                              <LessonCount count={mod.lessons?.length ?? 0} />
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="space-y-1 pl-5">
                              {mod.lessons
                                ?.sort((a: any, b: any) => a.order_index - b.order_index)
                                .map((lesson: any) => (
                                  <li
                                    key={lesson.id}
                                    className="flex items-center gap-2 text-sm text-muted-foreground"
                                  >
                                    <GripVertical className="h-3 w-3" />
                                    {lesson.title}
                                    {lesson.video_url_hls && (
                                      <span className="text-xs text-primary">HLS</span>
                                    )}
                                  </li>
                                ))}
                            </ul>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLessonDialog(mod.id)}
                              className="mt-2 h-7 text-xs"
                            >
                              <Plus className="mr-1 h-3 w-3" /> Añadir Lección
                            </Button>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                  </Accordion>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ FIX: AlertDialog de confirmación de borrado */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Se eliminarán el curso, sus módulos y lecciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteCourse.mutate(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCourse.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Course Dialog */}
      <Dialog open={courseDialog} onOpenChange={setCourseDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nuevo Curso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={courseForm.slug}
                onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })}
                placeholder="auto-generado"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={courseForm.description}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, description: e.target.value })
                }
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>URL de Miniatura</Label>
              <Input
                value={courseForm.thumbnail_url}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, thumbnail_url: e.target.value })
                }
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createCourse.mutate()}
              disabled={createCourse.isPending || !courseForm.title}
            >
              {createCourse.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Module Dialog */}
      <Dialog open={!!moduleDialog} onOpenChange={() => setModuleDialog(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Añadir Módulo</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              className="bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addModule.mutate(moduleDialog!)}
              disabled={addModule.isPending || !moduleTitle}
            >
              {addModule.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Añadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog open={!!lessonDialog} onOpenChange={() => setLessonDialog(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Añadir Lección</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={lessonForm.description}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, description: e.target.value })
                }
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>URL HLS (.m3u8)</Label>
              <Input
                value={lessonForm.video_url_hls}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, video_url_hls: e.target.value })
                }
                placeholder="https://...m3u8"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>URL de Recursos (opcional)</Label>
              <Input
                value={lessonForm.resources_url}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, resources_url: e.target.value })
                }
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addLesson.mutate(lessonDialog!)}
              disabled={addLesson.isPending || !lessonForm.title}
            >
              {addLesson.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Añadir Lección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ✅ FIX: renombrado de Badge → LessonCount para evitar colisión con shadcn/ui Badge
function LessonCount({ count }: { count: number }) {
  return (
    <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
      {count}
    </span>
  );
}