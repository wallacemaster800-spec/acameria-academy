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

      return {
        profile: profileRes.data ?? null,
        isAdmin: roleRes.data === true,
      };
    } catch (error) {
      console.error("Error fetching profile:", error);
      return { profile: null, isAdmin: false };
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleSession = async (session: Session | null) => {
      if (!mountedRef.current) return;

      if (session?.user) {
        // Estado base primero
        setState(prev => ({
          ...prev,
          user: session.user,
          session,
          loading: true,
        }));

        const { profile, isAdmin } = await fetchProfile(session.user.id);

        if (!mountedRef.current) return;

        setState({
          user: session.user,
          session,
          profile,
          isAdmin,
          loading: false,
        });
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          isAdmin: false,
          loading: false,
        });
      }
    };

    // Restaurar sesión inicial (IMPORTANTE para refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Escuchar cambios
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
    await supabase.auth.signOut();
  }, []);

  return { ...state, signOut };
}

