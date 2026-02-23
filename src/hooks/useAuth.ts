import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  profile: {
    email: string;
    full_name: string | null;
    access_expires_at: string | null;
  } | null;
  loading: boolean;
}

// Caché de módulo: persiste entre renders del mismo tab.
// Se limpia en signOut para evitar que datos de un usuario
// contaminen la sesión del siguiente.
let profileCache: Record<string, AuthState["profile"]> = {};
let roleCache: Record<string, boolean> = {};
let inFlight: Record<string, Promise<{ profile: AuthState["profile"]; isAdmin: boolean }>> = {};

// ✅ TTL del caché: 5 minutos. Si el rol o perfil cambia en DB,
// se refleja en la próxima sesión o al vencer el TTL.
const CACHE_TTL_MS = 1000 * 60 * 5;
let cacheTimestamps: Record<string, number> = {};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    profile: null,
    loading: true,
  });

  const mountedRef = useRef(true);

  const fetchProfile = useCallback(async (userId: string) => {
    // Deduplicar requests simultáneos
    if (inFlight[userId]) return inFlight[userId];

    // ✅ FIX: respetar TTL — antes el caché era eterno.
    // Si el rol cambiaba en DB, el usuario nunca lo veía sin recargar.
    const cached = profileCache[userId];
    const cachedAt = cacheTimestamps[userId] ?? 0;
    const isFresh = Date.now() - cachedAt < CACHE_TTL_MS;

    if (cached !== undefined && isFresh) {
      return {
        profile: cached,
        isAdmin: roleCache[userId] ?? false,
      };
    }

    inFlight[userId] = (async () => {
      try {
        const [profileRes, roleRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("email, full_name, access_expires_at")
            .eq("id", userId)
            .single(),
          supabase.rpc("has_role", {
            _user_id: userId,
            _role: "admin" as const,
          }),
        ]);

        const profile = profileRes.data ?? null;
        const isAdmin = roleRes.data === true;

        profileCache[userId] = profile;
        roleCache[userId] = isAdmin;
        cacheTimestamps[userId] = Date.now();

        return { profile, isAdmin };
      } catch (error) {
        console.error("[useAuth] Error fetching profile:", error);
        return { profile: null, isAdmin: false };
      } finally {
        delete inFlight[userId];
      }
    })();

    return inFlight[userId];
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleSession = async (session: Session | null) => {
      if (!mountedRef.current) return;

      if (session?.user) {
        const userId = session.user.id;

        // Marcar loading solo si el perfil no está cacheado
        if (!profileCache[userId]) {
          setState((prev) => ({ ...prev, user: session.user, session, loading: true }));
        }

        const { profile, isAdmin } = await fetchProfile(userId);
        if (!mountedRef.current) return;

        setState({ user: session.user, session, profile, isAdmin, loading: false });
      } else {
        setState({ user: null, session: null, profile: null, isAdmin: false, loading: false });
      }
    };

    // ✅ FIX: antes se usaban AMBOS getSession() + onAuthStateChange.
    // onAuthStateChange dispara INITIAL_SESSION inmediatamente al suscribirse,
    // entonces handleSession se llamaba dos veces en cada mount causando
    // doble fetch y doble setState.
    // Solución: solo onAuthStateChange — cubre sesión inicial y cambios futuros.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    // Limpiar todo el caché al cerrar sesión
    profileCache = {};
    roleCache = {};
    inFlight = {};
    cacheTimestamps = {};
    await supabase.auth.signOut();
  }, []);

  return { ...state, signOut };
}