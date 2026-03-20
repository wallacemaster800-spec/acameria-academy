import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2, BookOpen, Trash2, GripVertical, X, Pencil } from "lucide-react";

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

  // ── Edición de cursos/módulos/lecciones ───────────────────────────────
  const [editCourseDialog, setEditCourseDialog] = useState<string | null>(null);
  const [editCourseForm, setEditCourseForm] = useState({
    title: "",
    description: "",
    thumbnail_url: "",
    slug: "",
  });

  const [editModuleDialog, setEditModuleDialog] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");

  const [editLessonDialog, setEditLessonDialog] = useState<string | null>(null);
  const [editLessonForm, setEditLessonForm] = useState({
    title: "",
    description: "",
    video_url_hls: "",
    resources_url: "",
  });

  const [deleteModuleConfirm, setDeleteModuleConfirm] = useState<string | null>(null);
  const [deleteLessonConfirm, setDeleteLessonConfirm] = useState<string | null>(null);

  type PendingResource = {
    type: "pdf" | "youtube" | "snippet";
    title: string;
    url: string;
    content: string;
    language: string;
  };

  const emptyPendingResource: PendingResource = {
    type: "pdf",
    title: "",
    url: "",
    content: "",
    language: "",
  };

  const [pendingResources, setPendingResources] = useState<PendingResource[]>([]);
  const [resourceForm, setResourceForm] = useState<PendingResource>(emptyPendingResource);

  const [editResourcesDialogLessonId, setEditResourcesDialogLessonId] = useState<string | null>(null);
  const [editResourceForm, setEditResourceForm] = useState<PendingResource>(emptyPendingResource);

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

      const {
        data: newLesson,
        error: lessonError,
      } = await supabase
        .from("lessons")
        .insert({
          module_id: moduleId,
          title: lessonForm.title,
          description: lessonForm.description,
          video_url_hls: lessonForm.video_url_hls,
          resources_url: lessonForm.resources_url || null,
          order_index: orderIndex,
        })
        .select("id")
        .single();

      if (lessonError) throw lessonError;
      const newLessonId = newLesson.id;

      if (pendingResources.length > 0) {
        const { error: resourcesError } = await supabase.from("lesson_resources").insert(
          pendingResources.map((r, i) => ({
            lesson_id: newLessonId,
            type: r.type,
            title: r.title,
            url: r.url || null,
            content: r.content || null,
            language: r.language || null,
            order_index: i,
          }))
        );
        if (resourcesError) throw resourcesError;
      }
    },
    onSuccess: () => {
      toast.success("Lección añadida");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setLessonDialog(null);
      setLessonForm({ title: "", description: "", video_url_hls: "", resources_url: "" });
      setPendingResources([]);
      setResourceForm(emptyPendingResource);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const {
    data: editLessonResources,
    isLoading: editLessonResourcesLoading,
    isError: editLessonResourcesError,
  } = useQuery({
    queryKey: ["lesson-resources", editResourcesDialogLessonId],
    enabled: !!editResourcesDialogLessonId,
    queryFn: async () => {
      const lessonId = editResourcesDialogLessonId;
      if (!lessonId) return [];
      const { data, error } = await supabase
        .from("lesson_resources")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tables<"lesson_resources">[];
    },
  });

  const addLessonResource = useMutation({
    mutationFn: async ({
      lessonId,
      resource,
      orderIndex,
    }: {
      lessonId: string;
      resource: PendingResource;
      orderIndex: number;
    }) => {
      const { error } = await supabase.from("lesson_resources").insert({
        lesson_id: lessonId,
        type: resource.type,
        title: resource.title,
        url: resource.type === "snippet" ? null : resource.url || null,
        content: resource.type === "snippet" ? resource.content || null : null,
        language: resource.type === "snippet" ? resource.language || null : null,
        order_index: orderIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-resources", editResourcesDialogLessonId] });
      toast.success("Recurso agregado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLessonResource = useMutation({
    mutationFn: async ({ resourceId }: { resourceId: string }) => {
      const { error } = await supabase.from("lesson_resources").delete().eq("id", resourceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-resources", editResourcesDialogLessonId] });
      toast.success("Recurso eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Edición de curso/módulo/lección ────────────────────────────────────
  const updateCourse = useMutation({
    mutationFn: async ({
      id,
      form,
    }: {
      id: string;
      form: typeof editCourseForm;
    }) => {
      const { error } = await supabase
        .from("courses")
        .update({
          title: form.title,
          description: form.description,
          thumbnail_url: form.thumbnail_url,
          slug: form.slug,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Curso actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setEditCourseDialog(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteModule = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase.from("modules").delete().eq("id", moduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Módulo eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setDeleteModuleConfirm(null);
      setEditModuleDialog(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateModule = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("modules").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Módulo actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setEditModuleDialog(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lección eliminada");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setDeleteLessonConfirm(null);
      setEditLessonDialog(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateLesson = useMutation({
    mutationFn: async ({
      id,
      form,
    }: {
      id: string;
      form: typeof editLessonForm;
    }) => {
      const { error } = await supabase
        .from("lessons")
        .update({
          title: form.title,
          description: form.description,
          video_url_hls: form.video_url_hls,
          resources_url: form.resources_url || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lección actualizada");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      setEditLessonDialog(null);
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditCourseForm({
                        title: course.title,
                        description: course.description,
                        thumbnail_url: course.thumbnail_url,
                        slug: course.slug,
                      });
                      setEditCourseDialog(course.id);
                    }}
                    className="text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
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
                            <span className="flex items-center gap-2 flex-1 min-w-0">
                              <GripVertical className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate">{mod.title}</span>
                              {/* ✅ FIX: renombrado LessonCount para evitar colisión con shadcn Badge */}
                              <LessonCount count={mod.lessons?.length ?? 0} />
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setEditModuleTitle(mod.title);
                                  setEditModuleDialog(mod.id);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 p-0 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setDeleteModuleConfirm(mod.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="space-y-1 pl-5">
                              {mod.lessons
                                ?.sort((a: any, b: any) => a.order_index - b.order_index)
                                .map((lesson: any) => (
                                  <li
                                    key={lesson.id}
                                    className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <GripVertical className="h-3 w-3" />
                                      <span className="truncate">{lesson.title}</span>
                                      {lesson.video_url_hls && (
                                        <span className="text-xs text-primary">HLS</span>
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setEditLessonForm({
                                            title: lesson.title ?? "",
                                            description: lesson.description ?? "",
                                            video_url_hls: lesson.video_url_hls ?? "",
                                            resources_url: lesson.resources_url ?? "",
                                          });
                                          setEditLessonDialog(lesson.id);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 p-0 text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setDeleteLessonConfirm(lesson.id);
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => setEditResourcesDialogLessonId(lesson.id)}
                                    >
                                      Recursos
                                    </Button>
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
      <Dialog
        open={!!lessonDialog}
        onOpenChange={(open) => {
          if (!open) {
            setLessonDialog(null);
            setPendingResources([]);
            setResourceForm(emptyPendingResource);
            setLessonForm({ title: "", description: "", video_url_hls: "", resources_url: "" });
          }
        }}
      >
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

            <Accordion type="single" collapsible defaultValue="resources" className="w-full">
              <AccordionItem value="resources">
                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                  ➕ Recursos de la lección (opcional)
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipo de recurso</Label>
                      <Select
                        value={resourceForm.type}
                        onValueChange={(val) =>
                          setResourceForm((prev) => ({
                            ...prev,
                            type: val as PendingResource["type"],
                          }))
                        }
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="snippet">Snippet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Título del recurso</Label>
                      <Input
                        value={resourceForm.title}
                        onChange={(e) =>
                          setResourceForm((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="bg-background"
                      />
                    </div>

                    {resourceForm.type === "pdf" ? (
                      <div className="space-y-2">
                        <Label>URL del PDF</Label>
                        <Input
                          value={resourceForm.url}
                          onChange={(e) =>
                            setResourceForm((prev) => ({
                              ...prev,
                              url: e.target.value,
                            }))
                          }
                          className="bg-background"
                          placeholder="https://..."
                        />
                      </div>
                    ) : null}

                    {resourceForm.type === "youtube" ? (
                      <div className="space-y-2">
                        <Label>URL de YouTube</Label>
                        <Input
                          value={resourceForm.url}
                          onChange={(e) =>
                            setResourceForm((prev) => ({
                              ...prev,
                              url: e.target.value,
                            }))
                          }
                          className="bg-background"
                          placeholder="https://youtube.com/watch?v=..."
                        />
                      </div>
                    ) : null}

                    {resourceForm.type === "snippet" ? (
                      <>
                        <div className="space-y-2">
                          <Label>Código</Label>
                          <Textarea
                            value={resourceForm.content}
                            onChange={(e) =>
                              setResourceForm((prev) => ({
                                ...prev,
                                content: e.target.value,
                              }))
                            }
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Lenguaje (ej: bash, python)</Label>
                          <Input
                            value={resourceForm.language}
                            onChange={(e) =>
                              setResourceForm((prev) => ({
                                ...prev,
                                language: e.target.value,
                              }))
                            }
                            className="bg-background"
                            placeholder="python"
                          />
                        </div>
                      </>
                    ) : null}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const titleOk = resourceForm.title.trim().length > 0;
                        const urlOk =
                          resourceForm.type !== "snippet" && resourceForm.url.trim().length > 0;
                        const contentOk =
                          resourceForm.type === "snippet" && resourceForm.content.trim().length > 0;

                        if (!titleOk || (!urlOk && !contentOk)) return;

                        setPendingResources((prev) => [
                          ...prev,
                          {
                            ...resourceForm,
                            url: resourceForm.type === "snippet" ? "" : resourceForm.url,
                            content: resourceForm.type === "snippet" ? resourceForm.content : "",
                          },
                        ]);
                        setResourceForm(emptyPendingResource);
                      }}
                      disabled={
                        !resourceForm.title.trim() ||
                        (resourceForm.type === "snippet"
                          ? !resourceForm.content.trim()
                          : !resourceForm.url.trim())
                      }
                      className="w-full"
                    >
                      Agregar recurso
                    </Button>

                    {pendingResources.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">
                          Recursos agregados
                        </p>
                        <ul className="space-y-2">
                          {pendingResources.map((r, idx) => (
                            <li key={`${r.title}-${idx}`} className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">
                                  {r.type.toUpperCase()}: {r.title}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() =>
                                  setPendingResources((prev) => prev.filter((_, i) => i !== idx))
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLessonDialog(null);
                setPendingResources([]);
                setResourceForm(emptyPendingResource);
                setLessonForm({
                  title: "",
                  description: "",
                  video_url_hls: "",
                  resources_url: "",
                });
              }}
            >
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

      {/* Edit Lesson Resources Dialog */}
      <Dialog
        open={!!editResourcesDialogLessonId}
        onOpenChange={(open) => {
          if (!open) {
            setEditResourcesDialogLessonId(null);
            setEditResourceForm(emptyPendingResource);
          }
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar recursos de lección</DialogTitle>
          </DialogHeader>

          {editLessonResourcesLoading ? (
            <div className="space-y-4 py-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : editLessonResourcesError ? (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
              <p className="text-red-200 font-bold">No se pudieron cargar los recursos.</p>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de recurso</Label>
                  <Select
                    value={editResourceForm.type}
                    onValueChange={(val) =>
                      setEditResourceForm((prev) => ({
                        ...prev,
                        type: val as PendingResource["type"],
                      }))
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="snippet">Snippet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Título del recurso</Label>
                  <Input
                    value={editResourceForm.title}
                    onChange={(e) =>
                      setEditResourceForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="bg-background"
                  />
                </div>

                {editResourceForm.type === "pdf" ? (
                  <div className="space-y-2">
                    <Label>URL del PDF</Label>
                    <Input
                      value={editResourceForm.url}
                      onChange={(e) =>
                        setEditResourceForm((prev) => ({
                          ...prev,
                          url: e.target.value,
                        }))
                      }
                      className="bg-background"
                      placeholder="https://..."
                    />
                  </div>
                ) : null}

                {editResourceForm.type === "youtube" ? (
                  <div className="space-y-2">
                    <Label>URL de YouTube</Label>
                    <Input
                      value={editResourceForm.url}
                      onChange={(e) =>
                        setEditResourceForm((prev) => ({
                          ...prev,
                          url: e.target.value,
                        }))
                      }
                      className="bg-background"
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                ) : null}

                {editResourceForm.type === "snippet" ? (
                  <>
                    <div className="space-y-2">
                      <Label>Código</Label>
                      <Textarea
                        value={editResourceForm.content}
                        onChange={(e) =>
                          setEditResourceForm((prev) => ({
                            ...prev,
                            content: e.target.value,
                          }))
                        }
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lenguaje (ej: bash, python)</Label>
                      <Input
                        value={editResourceForm.language}
                        onChange={(e) =>
                          setEditResourceForm((prev) => ({
                            ...prev,
                            language: e.target.value,
                          }))
                        }
                        className="bg-background"
                        placeholder="python"
                      />
                    </div>
                  </>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={
                    !editResourceForm.title.trim() ||
                    (editResourceForm.type === "snippet"
                      ? !editResourceForm.content.trim()
                      : !editResourceForm.url.trim())
                  }
                  onClick={() => {
                    if (!editResourcesDialogLessonId) return;
                    const maxOrder =
                      (editLessonResources ?? []).reduce(
                        (acc, r) => Math.max(acc, r.order_index),
                        -1
                      ) ?? -1;
                    addLessonResource.mutate({
                      lessonId: editResourcesDialogLessonId,
                      resource: editResourceForm,
                      orderIndex: maxOrder + 1,
                    });
                    setEditResourceForm(emptyPendingResource);
                  }}
                >
                  Agregar recurso
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold text-foreground">Recursos existentes</p>
                {editLessonResources?.length ? (
                  <ul className="space-y-2">
                    {editLessonResources.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {r.type.toUpperCase()}: {r.title}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteLessonResource.mutate({ resourceId: r.id })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay recursos todavía.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edición: Cursos / Módulos / Lecciones ─────────────────────────── */}

      <AlertDialog
        open={!!deleteModuleConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteModuleConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar módulo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el módulo y todas sus lecciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteModuleConfirm && deleteModule.mutate(deleteModuleConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteModule.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteLessonConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteLessonConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lección?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLessonConfirm && deleteLesson.mutate(deleteLessonConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLesson.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!editCourseDialog}
        onOpenChange={(open) => {
          if (!open) setEditCourseDialog(null);
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar Curso</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={editCourseForm.title}
                onChange={(e) =>
                  setEditCourseForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={editCourseForm.slug}
                onChange={(e) =>
                  setEditCourseForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={editCourseForm.description}
                onChange={(e) =>
                  setEditCourseForm((prev) => ({ ...prev, description: e.target.value }))
                }
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>URL de Miniatura</Label>
              <Input
                value={editCourseForm.thumbnail_url}
                onChange={(e) =>
                  setEditCourseForm((prev) => ({ ...prev, thumbnail_url: e.target.value }))
                }
                className="bg-background"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCourseDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editCourseDialog &&
                updateCourse.mutate({
                  id: editCourseDialog,
                  form: editCourseForm,
                })
              }
              disabled={updateCourse.isPending || !editCourseDialog}
            >
              {updateCourse.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editModuleDialog}
        onOpenChange={(open) => {
          if (!open) setEditModuleDialog(null);
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar Módulo</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={editModuleTitle}
              onChange={(e) => setEditModuleTitle(e.target.value)}
              className="bg-background"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModuleDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editModuleDialog &&
                updateModule.mutate({
                  id: editModuleDialog,
                  title: editModuleTitle,
                })
              }
              disabled={updateModule.isPending || !editModuleDialog}
            >
              {updateModule.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editLessonDialog}
        onOpenChange={(open) => {
          if (!open) setEditLessonDialog(null);
        }}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar Lección</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={editLessonForm.title}
                onChange={(e) =>
                  setEditLessonForm((prev) => ({ ...prev, title: e.target.value }))
                }
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={editLessonForm.description}
                onChange={(e) =>
                  setEditLessonForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>URL HLS (.m3u8)</Label>
              <Input
                value={editLessonForm.video_url_hls}
                onChange={(e) =>
                  setEditLessonForm((prev) => ({
                    ...prev,
                    video_url_hls: e.target.value,
                  }))
                }
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>URL de Recursos (opcional)</Label>
              <Input
                value={editLessonForm.resources_url}
                onChange={(e) =>
                  setEditLessonForm((prev) => ({
                    ...prev,
                    resources_url: e.target.value,
                  }))
                }
                className="bg-background"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLessonDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                editLessonDialog &&
                updateLesson.mutate({
                  id: editLessonDialog,
                  form: editLessonForm,
                })
              }
              disabled={updateLesson.isPending || !editLessonDialog}
            >
              {updateLesson.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Guardar
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