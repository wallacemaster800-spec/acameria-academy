import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, memo } from "react";
import { Calendar, Clock, CheckCircle, AlertCircle, Trash2, Edit3, Loader2 } from "lucide-react";
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
import { toast } from "sonner";

// ✅ FIX: StudentRow fuera del componente padre para evitar
// que se recree en cada render y rompa la memoización de React.
const StudentRow = memo(function StudentRow({
  s,
  type,
  onUpdate,
  onRemove,
  isUpdating,
}: {
  s: any;
  type: "active" | "expired";
  // ✅ FIX: cada fila maneja su propia fecha en lugar de compartir
  // un estado global — antes cambiar la fecha en una fila y hacer
  // click en otra guardaba la fecha equivocada.
  onUpdate: (userId: string, date: string) => void;
  onRemove: (userId: string) => void;
  isUpdating: boolean;
}) {
  const [rowDate, setRowDate] = useState("");

  return (
    <div className="bg-card border p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3">
        {type === "active" ? (
          <CheckCircle className="text-green-500 w-5 h-5 shrink-0" />
        ) : (
          <AlertCircle className="text-red-500 w-5 h-5 shrink-0" />
        )}
        <div>
          <div className="font-semibold">{s.profiles?.email}</div>
          <div className="text-xs text-muted-foreground">
            {s.profiles?.full_name} • Expira:{" "}
            {new Date(s.expires_at).toLocaleDateString("es-AR")}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={rowDate}
          className="border rounded px-2 py-1 text-sm bg-white text-black border-slate-400 [color-scheme:light]"
          onChange={(e) => setRowDate(e.target.value)}
        />
        <button
          onClick={() => onUpdate(s.user_id, rowDate)}
          disabled={isUpdating}
          className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
          title="Actualizar expiración"
        >
          {isUpdating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Edit3 className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => onRemove(s.user_id)}
          className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
          title="Eliminar acceso"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default function AdminCourseStudents() {
  const { id } = useParams();
  const qc = useQueryClient();

  // Estado de la solicitud en curso (para el picker de fecha)
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");

  // ✅ FIX: confirmación de borrado — acción destructiva
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: allStudents = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["courseStudents", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_courses")
        .select("user_id, expires_at, profiles(email, full_name)")
        .eq("course_id", id);
      if (error) throw error;
      return data;
    },
  });

  const { data: reqs = [], isLoading: loadingReqs } = useQuery({
    queryKey: ["courseRequests", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_requests")
        .select("id, user_id, profiles(email, full_name)")
        .eq("course_id", id)
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
  });

  // ── Filtros ────────────────────────────────────────────────────────────────
  const { activeStudents, expiredStudents } = useMemo(() => {
    const now = new Date();
    return {
      activeStudents: allStudents.filter((s: any) => new Date(s.expires_at) > now),
      expiredStudents: allStudents.filter((s: any) => new Date(s.expires_at) <= now),
    };
  }, [allStudents]);

  // ── Helper: calcular fecha de expiración ──────────────────────────────────
  const resolveExpiry = (dateStr: string): Date => {
    if (dateStr) return new Date(dateStr);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const giveAccess = useMutation({
    mutationFn: async ({ userId, date }: { userId: string; date: string }) => {
      const expires_at = resolveExpiry(date).toISOString();
      const { error: upsertErr } = await supabase
        .from("user_courses")
        .upsert({ user_id: userId, course_id: id, expires_at }, { onConflict: "user_id,course_id" });
      if (upsertErr) throw upsertErr;

      const { error: reqErr } = await supabase
        .from("course_requests")
        .update({ status: "approved" })
        .eq("user_id", userId)
        .eq("course_id", id);
      if (reqErr) throw reqErr;
    },
    onSuccess: () => {
      toast.success("Acceso otorgado");
      // ✅ FIX: invalidar solo las queries afectadas, no toda la app
      qc.invalidateQueries({ queryKey: ["courseStudents", id] });
      qc.invalidateQueries({ queryKey: ["courseRequests", id] });
      setSelected(null);
      setSelectedDate("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ userId, date }: { userId: string; date: string }) => {
      const expires_at = resolveExpiry(date).toISOString();
      const { error } = await supabase
        .from("user_courses")
        .update({ expires_at })
        .eq("user_id", userId)
        .eq("course_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acceso actualizado");
      // ✅ FIX: solo invalidar la query relevante
      qc.invalidateQueries({ queryKey: ["courseStudents", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_courses")
        .delete()
        .eq("user_id", userId)
        .eq("course_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acceso eliminado");
      qc.invalidateQueries({ queryKey: ["courseStudents", id] });
      setRemoveConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-20 p-4">
      <h1 className="text-3xl font-bold tracking-tight">Gestión de Alumnos</h1>

      {/* 1. SOLICITUDES PENDIENTES */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Clock className="text-amber-500 w-6 h-6" />
          <h2 className="text-xl font-bold">Solicitudes Pendientes</h2>
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">
            {reqs.length}
          </span>
        </div>

        {loadingReqs ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando solicitudes...
          </div>
        ) : reqs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No hay solicitudes nuevas.</p>
        ) : (
          <div className="grid gap-3">
            {reqs.map((r: any) => (
              <div
                key={r.id}
                className="bg-amber-50/50 border border-amber-200 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
              >
                <div>
                  <div className="font-semibold text-amber-900">{r.profiles?.email}</div>
                  <div className="text-xs text-amber-700">{r.profiles?.full_name}</div>
                </div>

                {selected === r.user_id ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <input
                      type="date"
                      value={selectedDate}
                      className="border rounded px-2 py-1 text-sm bg-white text-black border-slate-400 [color-scheme:light]"
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <button
                      onClick={() => giveAccess.mutate({ userId: r.user_id, date: selectedDate })}
                      disabled={giveAccess.isPending}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                    >
                      {giveAccess.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                      Confirmar
                    </button>
                    <button
                      onClick={() => { setSelected(null); setSelectedDate(""); }}
                      className="text-muted-foreground text-sm px-2"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelected(r.user_id)}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-md text-sm font-bold shadow-sm transition-all"
                  >
                    Dar Acceso / Renovar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. VENCIDOS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2 text-red-600">
          <AlertCircle className="w-6 h-6" />
          <h2 className="text-xl font-bold">Accesos Vencidos</h2>
          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
            {expiredStudents.length}
          </span>
        </div>

        {loadingStudents ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
          </div>
        ) : expiredStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No hay alumnos vencidos.</p>
        ) : (
          <div className="grid gap-3 opacity-90">
            {expiredStudents.map((s: any) => (
              <StudentRow
                key={s.user_id}
                s={s}
                type="expired"
                isUpdating={update.isPending}
                onUpdate={(userId, date) => update.mutate({ userId, date })}
                onRemove={(userId) => setRemoveConfirm(userId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. ACTIVOS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2 text-green-600">
          <CheckCircle className="w-6 h-6" />
          <h2 className="text-xl font-bold">Alumnos Activos</h2>
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
            {activeStudents.length}
          </span>
        </div>

        {loadingStudents ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
          </div>
        ) : activeStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No hay alumnos activos.</p>
        ) : (
          <div className="grid gap-3">
            {activeStudents.map((s: any) => (
              <StudentRow
                key={s.user_id}
                s={s}
                type="active"
                isUpdating={update.isPending}
                onUpdate={(userId, date) => update.mutate({ userId, date })}
                onRemove={(userId) => setRemoveConfirm(userId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ✅ FIX: confirmación antes de borrar acceso */}
      <AlertDialog open={!!removeConfirm} onOpenChange={() => setRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar acceso?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitará el acceso al curso para este alumno. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeConfirm && remove.mutate(removeConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}