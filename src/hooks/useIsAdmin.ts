import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAdminRole = async () => {
      if (!user?.id) {
        if (mounted) {
          setIsAdmin(false);
          setIsCheckingAdmin(false);
        }
        return;
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
          setIsCheckingAdmin(false);
          return;
        }

        setIsAdmin(Boolean(data));
      } catch {
        if (!mounted) return;
        setIsAdmin(false);
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
  }, [user?.id]);

  return { isAdmin, isCheckingAdmin };
}
