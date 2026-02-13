import { useState, useEffect, useCallback } from "react";
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
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { ...state, signOut };
}
