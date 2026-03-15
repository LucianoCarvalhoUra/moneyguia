import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, Users, Search, Loader2, Crown, Check, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const MASTER_EMAIL = "lucianocarvalhoura@gmail.com";

interface UserInfo {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  current_plan_type: string;
  current_plan_name: string;
  subscription_status: string | null;
}

interface PlanOption {
  id: string;
  name: string;
  plan_type: string;
}

const planBadgeColors: Record<string, string> = {
  free: "bg-slate-100 text-slate-700",
  pro: "bg-blue-100 text-blue-700",
  premium: "bg-amber-100 text-amber-700",
};

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const isMaster = user?.email?.toLowerCase() === MASTER_EMAIL;

  useEffect(() => {
    if (isMaster) loadUsers();
  }, [isMaster]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_users" },
      });
      if (error) throw error;
      setUsers(data.users || []);
      setPlans(data.plans || []);
    } catch (err: any) {
      toast.error("Erro ao carregar usuários: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (userId: string, planId: string) => {
    setUpdatingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_user_plan", user_id: userId, plan_id: planId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Plano atualizado com sucesso!");
      await loadUsers();
    } catch (err: any) {
      toast.error("Erro ao atualizar plano: " + err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a conta de "${userName}"? Esta ação é irreversível.`)) return;
    setDeletingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete_user", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Conta excluída com sucesso!");
      await loadUsers();
    } catch (err: any) {
      toast.error("Erro ao excluir conta: " + err.message);
    } finally {
      setDeletingUserId(null);
    }
  };

  if (!isMaster) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Painel Administrativo
        </h1>
        <p className="text-muted-foreground">Gerencie os usuários e planos do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Usuários Cadastrados ({users.length})
          </CardTitle>
          <CardDescription>Altere o plano de qualquer usuário</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div
                  key={u.user_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{u.name || "Sem nome"}</p>
                      {u.email?.toLowerCase() === MASTER_EMAIL && (
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                          <Crown className="w-3 h-3 mr-1" />
                          Master
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={planBadgeColors[u.current_plan_type] || "bg-slate-100 text-slate-700"}>
                        {u.current_plan_name}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:min-w-[280px]">
                    <Select
                      value={plans.find((p) => p.plan_type === u.current_plan_type)?.id || ""}
                      onValueChange={(planId) => handleChangePlan(u.user_id, planId)}
                      disabled={updatingUserId === u.user_id}
                    >
                      <SelectTrigger className="w-full">
                        {updatingUserId === u.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <SelectValue placeholder="Alterar plano" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            <div className="flex items-center gap-2">
                              {plan.plan_type === u.current_plan_type && (
                                <Check className="w-3 h-3 text-primary" />
                              )}
                              {plan.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {u.email?.toLowerCase() !== MASTER_EMAIL && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => handleDeleteUser(u.user_id, u.name || u.email)}
                        disabled={deletingUserId === u.user_id}
                      >
                        {deletingUserId === u.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
