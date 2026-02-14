<<<<<<< HEAD
import { useState, useEffect, useCallback } from "react";
=======
import { useState, useEffect, useCallback, useRef } from "react";
>>>>>>> 29c90d1 (primer commit)
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

<<<<<<< HEAD
  const fetchProfile = useCallback(async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("email, full_name, access_expires_at").eq("id", userId).single(),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" as const }),
    ]);
    return {
      profile: profileRes.data ?? null,
      isAdmin: roleRes.data === true,
    };
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          // Set basic state immediately, fetch profile after
          setState(prev => ({ ...prev, user: session.user, session, loading: true }));
          const { profile, isAdmin } = await fetchProfile(session.user.id);
          setState({ user: session.user, session, profile, isAdmin, loading: false });
        } else {
          setState({ user: null, session: null, profile: null, isAdmin: false, loading: false });
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { profile, isAdmin } = await fetchProfile(session.user.id);
        setState({ user: session.user, session, profile, isAdmin, loading: false });
      } else {
        setState({ user: null, session: null, profile: null, isAdmin: false, loading: false });
      }
    });

    return () => subscription.unsubscribe();
=======
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
        // Set base state first
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

    // 1️⃣ Restaurar sesión inicial (CRÍTICO para refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // 2️⃣ Escuchar cambios de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
>>>>>>> 29c90d1 (primer commit)
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, signOut };
}
<<<<<<< HEAD
=======

>>>>>>> 29c90d1 (primer commit)
