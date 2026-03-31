import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const { user, isAdmin: authIsAdmin, isRoleLoading, userRole: authUserRole } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false);
      setUserRole(null);
      setIsCheckingAdmin(false);
      return;
    }

    setIsAdmin(authIsAdmin);
    setUserRole(authUserRole);
    setIsCheckingAdmin(isRoleLoading);
  }, [user?.id, authIsAdmin, authUserRole, isRoleLoading]);

  return { isAdmin, isCheckingAdmin, userRole };
}
