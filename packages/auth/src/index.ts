import { createClient, type Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

export type UserRole = "customer" | "worker" | "admin";

export type CurrentUser = {
  id: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
};

type ProfileRow = {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  is_active: boolean;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");

function mapProfile(row: ProfileRow): CurrentUser {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active
  };
}

export function useCurrentUser() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const loadProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setUser(null);
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, full_name, phone, is_active")
      .eq("id", currentSession.user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      setUser(null);
      setIsProfileLoading(false);
      return;
    }

    setUser(data ? mapProfile(data as ProfileRow) : null);
    setIsProfileLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      void loadProfile(data.session).finally(() => setIsLoading(false));
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  return useMemo(
    () => ({
      session,
      user,
      isAuthenticated: Boolean(session?.user),
      needsOnboarding: Boolean(session?.user && !user && !isProfileLoading),
      isLoading: isLoading || isProfileLoading,
      refreshProfile: () => loadProfile(session)
    }),
    [isLoading, isProfileLoading, loadProfile, session, user]
  );
}

export function useRequireRole(role: UserRole) {
  const current = useCurrentUser();

  return {
    ...current,
    isAllowed: current.user?.role === role
  };
}

export async function sendPhoneOtp(phone: string) {
  return supabase.auth.signInWithOtp({
    phone
  });
}

export async function verifyPhoneOtp(phone: string, token: string) {
  return supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms"
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}
