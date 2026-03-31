import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_FALLBACK_EMAIL = "lucianocarvalhoura@gmail.com";

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const cacheKey = user?.id ? `user_role_${user.id}` : null;

    const checkAdminRole = async () => {
      if (!user?.id) {
        if (mounted) {
          setIsAdmin(false);
          setUserRole(null);
          setIsCheckingAdmin(false);
        }
        return;
      }

      if (user.email === ADMIN_FALLBACK_EMAIL) {
        setUserRole("admin");
        setIsAdmin(true);
        setIsCheckingAdmin(false);
        console.log("[Auth] Meu cargo atual:", "admin");
        return;
      }

      // Mantém o estado persistido durante a sessão para evitar reset ao navegar
      if (cacheKey) {
        const cachedRole = sessionStorage.getItem(cacheKey);
        if (cachedRole) {
          const cachedIsAdmin = cachedRole === "admin";
          setUserRole(cachedRole);
          setIsAdmin(cachedIsAdmin);
          setIsCheckingAdmin(false);
          console.log("[Auth] Meu cargo atual:", cachedRole);
        }
      }

      setIsCheckingAdmin(true);
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          setIsAdmin(false);
          setUserRole("user");
          if (cacheKey) sessionStorage.setItem(cacheKey, "user");
          console.log("[Auth] Meu cargo atual:", "user");
          setIsCheckingAdmin(false);
          return;
        }

        const resolvedRole = data?.role === "admin" ? "admin" : "user";
        setUserRole(resolvedRole);
        setIsAdmin(resolvedRole === "admin");
        if (cacheKey) sessionStorage.setItem(cacheKey, resolvedRole);
        console.log("[Auth] Meu cargo atual:", resolvedRole);
      } catch {
        if (!mounted) return;
        setIsAdmin(false);
        setUserRole("user");
        if (cacheKey) sessionStorage.setItem(cacheKey, "user");
        console.log("[Auth] Meu cargo atual:", "user");
      } finally {
        if (mounted) {
          setIsCheckingAdmin(false);
        }
      }
    };

    checkAdminRole();

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.email]);

  return { isAdmin, isCheckingAdmin, userRole };
}
