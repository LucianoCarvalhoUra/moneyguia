import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Users, Search, Loader2, Crown, Check, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserInfo {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  current_plan_type: string;
  current_plan_name: string;
  subscription_status: string | null;
  current_billing_cycle: string | null;
  current_starts_at: string | null;
  current_expires_at: string | null;
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
  const { isAdmin, isCheckingAdmin } = useIsAdmin();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [userSort, setUserSort] = useState<"recent" | "expires_soon">("recent");
  const [selectedStartsAt, setSelectedStartsAt] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

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

  const paidPlans = plans.filter((p) => p.plan_type === "pro" || p.plan_type === "premium");

  const selectedUser = users.find((u) => u.user_id === selectedUserId) || null;
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;

  const handleSaveSubscription = async () => {
    if (!selectedUserId || !selectedPlanId || !selectedBillingCycle || !selectedStartsAt) {
      toast.error("Selecione usuário, plano, período e data de início.");
      return;
    }

    const startsAtDate = new Date(`${selectedStartsAt}T00:00:00`);
    if (Number.isNaN(startsAtDate.getTime())) {
      toast.error("Data de início inválida.");
      return;
    }

    const expiresAtDate = new Date(startsAtDate);
    if (selectedBillingCycle === "yearly") {
      expiresAtDate.setFullYear(expiresAtDate.getFullYear() + 1);
    } else {
      expiresAtDate.setMonth(expiresAtDate.getMonth() + 1);
    }

    if (Number.isNaN(expiresAtDate.getTime())) {
      toast.error("Não foi possível calcular expires_at.");
      return;
    }

    const startsAtIso = startsAtDate.toISOString();
    const expiresAtIso = expiresAtDate.toISOString();

    setUpdatingUserId(selectedUserId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "update_user_plan",
          user_id: selectedUserId,
          plan_id: selectedPlanId,
          billing_cycle: selectedBillingCycle,
          starts_at: startsAtIso,
          expires_at: expiresAtIso,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setUsers((current) =>
        current.map((item) => {
          if (item.user_id !== selectedUserId) return item;
          return {
            ...item,
            current_plan_type: selectedPlan?.plan_type || item.current_plan_type,
            current_plan_name: selectedPlan?.name || item.current_plan_name,
            subscription_status: "active",
            current_billing_cycle: selectedBillingCycle,
            current_starts_at: startsAtIso,
            current_expires_at: expiresAtIso,
          };
        })
      );

      if (selectedUserId === user?.id) {
        window.dispatchEvent(new Event("user-plan-changed"));
      }

      toast.success("Licença atualizada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao atualizar licença: " + err.message);
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

  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const resolveExpiresAt = (u: UserInfo): Date | null => {
    const expiresFromDb = u.current_expires_at ? new Date(u.current_expires_at) : null;
    if (expiresFromDb && !Number.isNaN(expiresFromDb.getTime())) {
      return expiresFromDb;
    }

    const startsAt = u.current_starts_at ? new Date(u.current_starts_at) : null;
    if (!startsAt || Number.isNaN(startsAt.getTime()) || !u.current_billing_cycle) {
      return null;
    }

    const derived = new Date(startsAt);
    if (u.current_billing_cycle === "yearly") {
      derived.setFullYear(derived.getFullYear() + 1);
    } else if (u.current_billing_cycle === "monthly") {
      derived.setMonth(derived.getMonth() + 1);
    }

    return Number.isNaN(derived.getTime()) ? null : derived;
  };

  const getExpirationMeta = (u: UserInfo) => {
    const expiresAt = resolveExpiresAt(u);
    const isPaidPlan = ["pro", "premium"].includes((u.current_plan_type || "").toLowerCase());

    if (!expiresAt) {
      if (isPaidPlan) {
        return {
          label: "Vence em: pendente de sincronização",
          className: "text-amber-600 font-medium",
          sortValue: Number.MAX_SAFE_INTEGER,
        };
      }

      return {
        label: "Vence em: -",
        className: "text-muted-foreground",
        sortValue: Number.MAX_SAFE_INTEGER,
      };
    }

    const now = new Date();
    const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startExpiry = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate());
    const msDiff = startExpiry.getTime() - startNow.getTime();
    const dayDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

    if (dayDiff < 0) {
      return {
        label: `Vence em: ${format(expiresAt, "dd/MM/yyyy", { locale: ptBR })}`,
        className: "text-red-600 font-semibold",
        sortValue: expiresAt.getTime(),
      };
    }

    if (dayDiff <= 5) {
      return {
        label: `Vence em: ${format(expiresAt, "dd/MM/yyyy", { locale: ptBR })}`,
        className: "text-amber-600 font-semibold",
        sortValue: expiresAt.getTime(),
      };
    }

    return {
      label: `Vence em: ${format(expiresAt, "dd/MM/yyyy", { locale: ptBR })}`,
      className: "text-muted-foreground",
      sortValue: expiresAt.getTime(),
    };
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (userSort === "expires_soon") {
      const aSort = getExpirationMeta(a).sortValue;
      const bSort = getExpirationMeta(b).sortValue;
      if (aSort !== bSort) return aSort - bSort;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

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
          <CardTitle>Gestão de Licenças</CardTitle>
          <CardDescription>
            Defina plano (PRO/PREMIUM) e período (mensal/anual). O vencimento será calculado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Usuário</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {(u.name || "Sem nome") + " — " + u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {paidPlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.plan_type.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={selectedBillingCycle} onValueChange={(value) => setSelectedBillingCycle(value as "monthly" | "yearly")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Início da licença</Label>
            <Input type="date" value={selectedStartsAt} onChange={(e) => setSelectedStartsAt(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Próxima cobrança</Label>
            <Input
              readOnly
              value={(() => {
                if (!selectedStartsAt) return "";
                const base = new Date(`${selectedStartsAt}T00:00:00`);
                if (Number.isNaN(base.getTime())) return "";
                if (selectedBillingCycle === "yearly") {
                  base.setFullYear(base.getFullYear() + 1);
                } else {
                  base.setMonth(base.getMonth() + 1);
                }
                return format(base, "dd/MM/yyyy", { locale: ptBR });
              })()}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">Cliente selecionado</p>
              <p className="text-muted-foreground">
                {selectedUser ? `${selectedUser.name || "Sem nome"} • ${selectedUser.email}` : "Nenhum cliente selecionado"}
              </p>
              <p className="text-muted-foreground mt-1">
                {selectedBillingCycle === "yearly" ? "Renovação Anual" : "Renovação Mensal"}
              </p>
            </div>
            <Button onClick={handleSaveSubscription} disabled={updatingUserId === selectedUserId || !selectedUserId || !selectedPlanId}>
              {updatingUserId === selectedUserId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Usuários Cadastrados ({users.length})
          </CardTitle>
          <CardDescription>Visualize planos, ciclo e vencimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_260px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={userSort} onValueChange={(value) => setUserSort(value as "recent" | "expires_soon")}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="expires_soon">Vencimentos mais próximos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : sortedUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</p>
          ) : (
            <div className="space-y-3">
              {sortedUsers.map((u) => (
                <div
                  key={u.user_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{u.name || "Sem nome"}</p>
                      {u.user_id === user?.id && (
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                          <Crown className="w-3 h-3 mr-1" />
                          Admin
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
                    <div className="text-right text-xs text-muted-foreground min-w-[170px]">
                      <p>
                        {u.current_plan_type?.toUpperCase() || "FREE"} {u.current_billing_cycle === "yearly" ? "Anual" : u.current_billing_cycle === "monthly" ? "Mensal" : "-"}
                      </p>
                      <p className={getExpirationMeta(u).className}>
                        {getExpirationMeta(u).label}
                      </p>
                    </div>
                    {u.user_id !== user?.id && (
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
