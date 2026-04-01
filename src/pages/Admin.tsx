import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Users, Search, Loader2, Crown, Check, Trash2, AlertTriangle, Info, Mail } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserInfo {
  user_id: string;
  name: string;
  email: string;
  created_at: string;
  lgpd_accepted_at: string | null;
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
  basic: "bg-slate-100 text-slate-700",
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
  const [deleteModalUser, setDeleteModalUser] = useState<UserInfo | null>(null);
  const [userDetails, setSelectedUserDetails] = useState<UserInfo | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_subscriptions(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedUsers: UserInfo[] = (data as any[]).map(p => {
        const sub = p.user_subscriptions?.[0];
        return {
          user_id: p.user_id || p.id,
          name: p.name || "Sem nome",
          email: p.email,
          created_at: p.created_at,
          lgpd_accepted_at: p.lgpd_accepted_at,
          current_plan_type: 'free',
          current_plan_name: 'Essencial',
          subscription_status: sub?.status || null,
          current_billing_cycle: sub?.billing_cycle || null,
          current_starts_at: sub?.starts_at || null,
          current_expires_at: sub?.expires_at || null,
        };
      });

      setUsers(formattedUsers);

      const { data: plansData } = await supabase.from('subscription_plans').select('*');
      setPlans(plansData || []);
    } catch (err: any) {
      toast.error("Erro ao carregar usuários: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // C. Modal de Detalhes com Re-fetch e Limpeza de Estado
  const handleOpenDetails = async (user: UserInfo) => {
    setIsFetchingDetails(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_subscriptions(*)')
        .eq('user_id', user.user_id)
        .maybeSingle();

      if (data && !error) {
        const sub = (data as any).user_subscriptions?.[0];
        const fullUserDetails: UserInfo = {
          user_id: data.user_id || data.id,
          name: data.name || "Sem nome",
          email: data.email,
          created_at: data.created_at,
          lgpd_accepted_at: data.lgpd_accepted_at,
          current_plan_type: user.current_plan_type,
          current_plan_name: user.current_plan_name,
          subscription_status: sub?.status || null,
          current_billing_cycle: sub?.billing_cycle || null,
          current_starts_at: sub?.starts_at || null,
          current_expires_at: sub?.expires_at || null,
        };
        setSelectedUserDetails(fullUserDetails);
      } else {
        // Se houver erro na query, usa os dados que já temos
        setSelectedUserDetails(user);
      }
    } catch (err) {
      console.error("Erro ao buscar detalhes do usuário:", err);
      setSelectedUserDetails(user);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const licensePlans = plans.filter((p) => ["free", "basic", "pro", "premium"].includes((p.plan_type || "").toLowerCase()));

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

  const handleDeleteUser = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete_user", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Conta excluída com sucesso!");
      setDeleteModalUser(null);
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
    if (!expiresFromDb || Number.isNaN(expiresFromDb.getTime())) {
      return null;
    }

    return expiresFromDb;
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
        label: "Vence em: Sem assinatura ativa",
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
            Defina plano (Básico/Pro/Premium) e período (mensal/anual). O vencimento será calculado automaticamente.
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
                {licensePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {(() => {
                      const normalized = (plan.plan_type || "").toLowerCase();
                      if (normalized === "free" || normalized === "basic") return "Básico";
                      if (normalized === "pro") return "Pro";
                      if (normalized === "premium") return "Premium";
                      return plan.name;
                    })()}
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

          <div className="md:col-span-2 rounded-3xl border border-white/40 bg-white/70 p-4 text-sm shadow-2xl backdrop-blur-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="font-medium">Cliente selecionado</p>
                <p className="text-muted-foreground">
                  {selectedUser ? `${selectedUser.name || "Sem nome"} • ${selectedUser.email}` : "Nenhum cliente selecionado"}
                </p>
                <p className="text-muted-foreground mt-1">
                  {selectedBillingCycle === "yearly" ? "Renovação Anual" : "Renovação Mensal"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/40 bg-white/65 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conformidade (LGPD)</p>
                {selectedUser?.lgpd_accepted_at ? (
                  <>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-violet-100/80 px-3 py-1 text-xs font-semibold text-violet-700">
                      <Check className="h-3.5 w-3.5" />
                      Status LGPD: Aceito
                    </div>
                    <p className="mt-2 text-xs text-violet-700">
                      Aceito em: {format(new Date(selectedUser.lgpd_accepted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold text-amber-700">
                      <Shield className="h-3.5 w-3.5" />
                      Status LGPD: Pendente
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Aguardando aceite de termos.</p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveSubscription} disabled={updatingUserId === selectedUserId || !selectedUserId || !selectedPlanId}>
                {updatingUserId === selectedUserId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
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
                (() => {
                  return (
                <div key={u.user_id} className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card/50 hover:bg-card hover:shadow-md transition-all cursor-pointer" onClick={() => handleOpenDetails(u)}>
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
                    <div className="mt-2 flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-medium">LGPD:</span>
                        {u.lgpd_accepted_at ? (
                          <div className="flex items-center gap-1 text-primary font-semibold">
                            <Check className="h-3.5 w-3.5" />
                            {format(new Date(u.lgpd_accepted_at), "dd/MM/yyyy HH:mm")}
                          </div>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-0">Pendente</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground font-medium">Vencimento:</span>
                        {!u.current_expires_at ? (
                          <span className="text-slate-400">Sem Assinatura</span>
                        ) : (
                          <span className={cn(
                            "font-medium",
                            isBefore(new Date(u.current_expires_at), startOfDay(new Date())) ? "text-red-500" : "text-foreground"
                          )}>
                            {format(new Date(u.current_expires_at), "dd/MM/yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:min-w-[120px] justify-end" onClick={e => e.stopPropagation()}>
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
                        onClick={() => setDeleteModalUser(u)}
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
                  );
                })()
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Usuário */}
      <Dialog open={!!userDetails} onOpenChange={(open) => !open && setSelectedUserDetails(null)}>
        <DialogContent className="max-w-lg rounded-3xl border border-white/40 bg-white/80 shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Detalhes do Cliente
            </DialogTitle>
            <DialogDescription>Dados completos de conformidade e faturamento.</DialogDescription>
          </DialogHeader>
          
          {isFetchingDetails ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : userDetails && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Nome</Label>
                  <p className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" /> {userDetails.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase">Email</Label>
                  <p className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {userDetails.email}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/50 p-5 border border-white/60 space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-2 border-b pb-2">
                  <Shield className="h-4 w-4 text-primary" /> Conformidade e Assinatura
                </h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status LGPD:</span>
                    <div className="flex items-center gap-1.5">
                      {userDetails.lgpd_accepted_at && <Check className="h-4 w-4 text-primary" />}
                      <Badge variant={userDetails.lgpd_accepted_at ? "default" : "secondary"}>
                        {userDetails.lgpd_accepted_at ? "Aceito" : "Pendente"}
                      </Badge>
                    </div>
                  </div>

                  {userDetails.lgpd_accepted_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aceito em:</span>
                      <span className="font-medium">{format(new Date(userDetails.lgpd_accepted_at), "dd/MM/yyyy HH:mm")}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expiração:</span>
                    <span className={cn(
                      "font-bold",
                      !userDetails.current_expires_at ? "text-slate-400" : isBefore(new Date(userDetails.current_expires_at), startOfDay(new Date())) ? "text-red-500" : "text-foreground"
                    )}>
                      {userDetails.current_expires_at 
                        ? format(new Date(userDetails.current_expires_at), "dd/MM/yyyy") 
                        : "Sem assinatura"
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteModalUser)} onOpenChange={(open) => !open && setDeleteModalUser(null)}>
        <AlertDialogContent className="rounded-3xl border border-white/40 bg-white/80 shadow-2xl shadow-violet-500/20 backdrop-blur-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Excluir Conta de Usuário?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e removerá todos os dados de <strong>{deleteModalUser?.name || deleteModalUser?.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingUserId)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteModalUser && handleDeleteUser(deleteModalUser.user_id)}
              disabled={!deleteModalUser || Boolean(deletingUserId)}
              className="bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/35 hover:brightness-110"
            >
              {deletingUserId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
