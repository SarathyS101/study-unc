// components/AuthProvider.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // 1) On mount, check if there's an existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);

      // 2a) If NOT signed in and trying to visit anything except "/" → redirect to "/"
      if (!session && pathname !== "/") {
        router.replace("/");
      }

      // 2b) If signed in and currently on "/" → redirect to "/check-rooms"
      if (session && pathname === "/") {
        router.replace("/check-rooms");
      }
    });

    // 3) Also listen to auth‐state changes (magic link clicked, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);

      // If they just signed out and aren’t already on "/", push to "/"
      if (!newSession && pathname !== "/") {
        router.replace("/");
      }

      // If they just signed in (via magic link) and are on "/", send to "/check-rooms"
      if (newSession && pathname === "/") {
        router.replace("/check-rooms");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  // 4) While we’re verifying getSession(), render nothing
  if (loading) {
    return null;
  }

  // 5) If there’s no session and we’re not on "/", render nothing (redirect will happen)
  if (!session && pathname !== "/") {
    return null;
  }

  // 6) Otherwise (either session exists, or we’re on "/" without a session), render children
  return <>{children}</>;
}
