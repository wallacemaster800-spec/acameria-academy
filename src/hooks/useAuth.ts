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

// 🔥 Cache REAL persistente entre renders
let profileCache: Record<string, AuthState["profile"]> = {};
let roleCache: Record<string, boolean> = {};
let inFlight: Record<string, Promise<{ profile: AuthState["profile"]; isAdmin: boolean }>> = {};

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
    // 🔥 Evita múltiples requests simultáneos
    if (inFlight[userId]) return inFlight[userId];

    // 🔥 Cache por usuario
    if (profileCache[userId] !== undefined) {
      return {
        profile: profileCache[userId],
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

        return { profile, isAdmin };
      } catch (error) {
        console.error("Error fetching profile:", error);
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

        setState(prev => ({
          ...prev,
          user: session.user,
          session,
          loading: true,
        }));

        const { profile, isAdmin } = await fetchProfile(userId);

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

    // 🔥 Solo se ejecuta una vez al montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

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
    profileCache = {};
    roleCache = {};
    inFlight = {};
    await supabase.auth.signOut();
  }, []);

  return { ...state, signOut };
}



