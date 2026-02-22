import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Calendar, Clock, CheckCircle, AlertCircle, Trash2, Edit3 } from "lucide-react";

export default function AdminCourseStudents() {
  const { id } = useParams();
  const qc = useQueryClient();

  const [expireDate, setExpireDate] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  /* 1. FETCH STUDENTS (ACTIVOS Y VENCIDOS) */
  const { data: allStudents = [] } = useQuery({
    queryKey: ["courseStudents", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_courses")
        .select(`user_id, expires_at, profiles(email, full_name)`)
        .eq("course_id", id);
      if (error) throw error;
      return data;
    },
  });

  /* 2. FETCH REQUESTS (PENDIENTES) */
  const { data: reqs = [] } = useQuery({
    queryKey: ["courseRequests", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_requests")
        .select(`id, user_id, profiles(email, full_name)`)
        .eq("course_id", id)
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
  });

  /* LÓGICA DE FILTRADO PARA LAS 3 TABLAS */
  const { activeStudents, expiredStudents } = useMemo(() => {
    const now = new Date();
    return {
      activeStudents: allStudents.filter((s: any) => new Date(s.expires_at) > now),
      expiredStudents: allStudents.filter((s: any) => new Date(s.expires_at) <= now),
    };
  }, [allStudents]);

  /* MUTATIONS */
  const giveAccess = useMutation({
    mutationFn: async (userId: string) => {
      let expire = new Date();
      if (expireDate) expire = new Date(expireDate);
      else expire.setDate(expire.getDate() + 30);

      await supabase.from("user_courses").upsert(
        { user_id: userId, course_id: id, expires_at: expire.toISOString() },
        { onConflict: "user_id,course_id" }
      );
      await supabase.from("course_requests").update({ status: "approved" }).eq("user_id", userId).eq("course_id", id);
    },
    onSuccess: () => { qc.invalidateQueries(); setSelected(null); setExpireDate(""); }
  });

  const update = useMutation({
    mutationFn: async (userId: string) => {
      let expire = new Date();
      if (expireDate) expire = new Date(expireDate);
      else expire.setDate(expire.getDate() + 30);

      await supabase.from("user_courses").update({ expires_at: expire.toISOString() }).eq("user_id", userId).eq("course_id", id);
    },
    onSuccess: () => { qc.invalidateQueries(); setExpireDate(""); }
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("user_courses").delete().eq("user_id", userId).eq("course_id", id);
    },
    onSuccess: () => qc.invalidateQueries()
  });

  // Reusable row component for the lists
  const StudentRow = ({ s, type }: { s: any, type: 'active' | 'expired' }) => (
    <div className="bg-card border p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3">
        {type === 'active' ? <CheckCircle className="text-green-500 w-5 h-5" /> : <AlertCircle className="text-red-500 w-5 h-5" />}
        <div>
          <div className="font-semibold">{s.profiles?.email}</div>
          <div className="text-xs text-muted-foreground">{s.profiles?.full_name} • Expira: {new Date(s.expires_at).toLocaleDateString()}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="date" 
          className="border rounded px-2 py-1 text-sm bg-white text-black border-slate-400 [color-scheme:light]" 
          onChange={(e) => setExpireDate(e.target.value)} 
        />
        <button onClick={() => update.mutate(s.user_id)} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors">
          <Edit3 className="w-4 h-4" />
        </button>
        <button onClick={() => remove.mutate(s.user_id)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-20 p-4">
      <h1 className="text-3xl font-bold tracking-tight">Gestión de Alumnos</h1>

      {/* 1. SOLICITUDES (Nuevas y Renovaciones) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Clock className="text-amber-500 w-6 h-6" />
          <h2 className="text-xl font-bold">Solicitudes Pendientes</h2>
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">{reqs.length}</span>
        </div>
        {reqs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No hay solicitudes nuevas.</p>
        ) : (
          <div className="grid gap-3">
            {reqs.map((r: any) => (
              <div key={r.id} className="bg-amber-50/50 border border-amber-200 p-4 rounded-lg flex items-center justify-between shadow-sm italic">
                <div>
                  <div className="font-semibold text-amber-900">{r.profiles?.email}</div>
                  <div className="text-xs text-amber-700">{r.profiles?.full_name}</div>
                </div>
                {selected === r.user_id ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <input 
                      type="date" 
                      className="border rounded px-2 py-1 text-sm bg-white text-black border-slate-400 [color-scheme:light]" 
                      onChange={(e) => setExpireDate(e.target.value)} 
                    />
                    <button onClick={() => giveAccess.mutate(r.user_id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium">Confirmar</button>
                    <button onClick={() => setSelected(null)} className="text-muted-foreground text-sm">X</button>
                  </div>
                ) : (
                  <button onClick={() => setSelected(r.user_id)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-md text-sm font-bold shadow-sm transition-all">
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
          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">{expiredStudents.length}</span>
        </div>
        <div className="grid gap-3 opacity-80 italic text-red-900">
          {expiredStudents.map((s: any) => <StudentRow key={s.user_id} s={s} type="expired" />)}
          {expiredStudents.length === 0 && <p className="text-sm text-muted-foreground italic">No hay alumnos vencidos.</p>}
        </div>
      </section>

      {/* 3. ACTIVOS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2 text-green-600">
          <CheckCircle className="w-6 h-6" />
          <h2 className="text-xl font-bold">Alumnos Activos</h2>
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">{activeStudents.length}</span>
        </div>
        <div className="grid gap-3 italic text-green-900">
          {activeStudents.map((s: any) => <StudentRow key={s.user_id} s={s} type="active" />)}
          {activeStudents.length === 0 && <p className="text-sm text-muted-foreground italic">No hay alumnos activos.</p>}
        </div>
      </section>
    </div>
  );
}