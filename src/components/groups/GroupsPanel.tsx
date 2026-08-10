import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, FolderPlus, Trash2, X, GripVertical, CopyPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface TransactionGroup {
  id: string;
  name: string;
  color: string;
  type: "expense" | "income" | "both";
}

export interface GroupedItem {
  id: string;
  groupId?: string;
  primary: string; // description/title
  secondary?: string; // category/date
  amount: number;
  isPaid?: boolean; // paid (expense) or received (income)
}

interface GroupsPanelProps {
  kind: "expense" | "income";
  items: GroupedItem[];
  onChanged: () => void;
  draggingId: string | null;
  selectedMonth?: number; // 0-indexed, current view month
  selectedYear?: number;
}

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export default function GroupsPanel({ kind, items, onChanged, draggingId, selectedMonth, selectedYear }: GroupsPanelProps) {
  const { user } = useAuth();
  const table = kind === "expense" ? "expenses" : "incomes";
  const dateField = kind === "expense" ? "due_date" : "receive_date";
  const descField = kind === "expense" ? "description" : "title";
  const paidField = kind === "expense" ? "is_paid" : "is_received";
  const [groups, setGroups] = useState<TransactionGroup[]>([]);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const loadGroups = async () => {
    if (!user) return;
    const { data, error } = await (supabase.from("transaction_groups") as any)
      .select("*")
      .eq("user_id", user.id)
      .in("type", [kind, "both"])
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setGroups((data || []) as TransactionGroup[]);
  };

  useEffect(() => {
    loadGroups();
  }, [user, kind]);

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    const color = PALETTE[groups.length % PALETTE.length];
    const { error } = await (supabase.from("transaction_groups") as any).insert({
      user_id: user.id,
      name: newName.trim(),
      color,
      type: kind,
    });
    if (error) {
      toast.error("Erro ao criar grupo");
      return;
    }
    setNewName("");
    setCreating(false);
    await loadGroups();
    toast.success("Grupo criado");
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Excluir este grupo? Os itens não serão removidos, apenas desagrupados.")) return;
    await (supabase.from(table) as any).update({ group_id: null }).eq("group_id", id);
    const { error } = await (supabase.from("transaction_groups") as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir grupo");
      return;
    }
    await loadGroups();
    onChanged();
    toast.success("Grupo excluído");
  };

  const handleDrop = async (e: React.DragEvent, groupId: string | null) => {
    e.preventDefault();
    setHoverId(null);
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;
    const { error } = await (supabase.from(table) as any)
      .update({ group_id: groupId })
      .eq("id", itemId);
    if (error) {
      toast.error("Erro ao atualizar grupo");
      return;
    }
    onChanged();
  };

  const removeFromGroup = async (itemId: string) => {
    const { error } = await (supabase.from(table) as any).update({ group_id: null }).eq("id", itemId);
    if (error) {
      toast.error("Erro ao desagrupar");
      return;
    }
    onChanged();
  };

  const handleCopyFromPreviousMonth = async () => {
    if (!user || selectedMonth === undefined || selectedYear === undefined) return;
    setCopying(true);
    try {
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      const startStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      const endStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const { data: prevItems, error: prevErr } = await (supabase.from(table) as any)
        .select(`id, ${descField}, group_id`)
        .eq("user_id", user.id)
        .not("group_id", "is", null)
        .gte(dateField, startStr)
        .lte(dateField, endStr);
      if (prevErr) throw prevErr;
      if (!prevItems || prevItems.length === 0) {
        toast.info("Nenhum agrupamento encontrado no mês anterior.");
        return;
      }

      const prevGroupIds = Array.from(new Set(prevItems.map((r: any) => r.group_id)));
      const { data: prevGroups } = await (supabase.from("transaction_groups") as any)
        .select("*")
        .in("id", prevGroupIds);

      // Build/ensure current month groups by name
      const nameToCurrentId = new Map<string, string>();
      for (const g of groups) nameToCurrentId.set(g.name.toLowerCase(), g.id);

      const idMap = new Map<string, string>(); // prev group id -> current group id
      for (const pg of (prevGroups || []) as TransactionGroup[]) {
        const key = pg.name.toLowerCase();
        let currentId = nameToCurrentId.get(key);
        if (!currentId) {
          const { data: inserted, error: insErr } = await (supabase.from("transaction_groups") as any)
            .insert({ user_id: user.id, name: pg.name, color: pg.color, type: kind })
            .select()
            .single();
          if (insErr) throw insErr;
          currentId = inserted.id;
          nameToCurrentId.set(key, currentId!);
        }
        idMap.set(pg.id, currentId!);
      }

      // Description -> target group id (from prev month assignments)
      const descToGroup = new Map<string, string>();
      for (const p of prevItems as any[]) {
        const target = idMap.get(p.group_id);
        if (target) descToGroup.set(String(p[descField] || "").trim().toLowerCase(), target);
      }

      // Assign only current month items (visible items in this month) that match by description and are ungrouped
      let assigned = 0;
      for (const item of items) {
        if (item.groupId) continue;
        const target = descToGroup.get(item.primary.trim().toLowerCase());
        if (!target) continue;
        const { error: upErr } = await (supabase.from(table) as any)
          .update({ group_id: target })
          .eq("id", item.id);
        if (!upErr) assigned++;
      }

      await loadGroups();
      onChanged();
      toast.success(
        assigned > 0
          ? `Agrupamentos copiados: ${assigned} item(ns) atribuído(s).`
          : "Grupos do mês anterior criados. Nenhum item correspondente encontrado por descrição.",
      );
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao copiar agrupamento: ${err.message || err}`);
    } finally {
      setCopying(false);
    }
  };

  const itemsByGroup = (gid: string) => items.filter((i) => i.groupId === gid);
  const totalByGroup = (gid: string) => itemsByGroup(gid).reduce((s, i) => s + i.amount, 0);
  const groupStatus = (gid: string): "empty" | "all_paid" | "pending" => {
    const gi = itemsByGroup(gid);
    if (gi.length === 0) return "empty";
    return gi.every((i) => i.isPaid) ? "all_paid" : "pending";
  };

  const canCopy = selectedMonth !== undefined && selectedYear !== undefined;

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Agrupamentos</h3>
            <span className="text-xs text-muted-foreground">
              Arraste itens da lista abaixo para um grupo
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canCopy && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyFromPreviousMonth}
                disabled={copying}
                title="Copia grupos e associa itens do mês atual por descrição igual à do mês anterior"
              >
                <CopyPlus className="w-4 h-4 mr-1" />
                {copying ? "Copiando..." : "Copiar mês anterior"}
              </Button>
            )}
            {!creating ? (
              <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                <FolderPlus className="w-4 h-4 mr-1" /> Novo grupo
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  placeholder="Ex: Moradia"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") {
                      setCreating(false);
                      setNewName("");
                    }
                  }}
                  className="h-8 w-40"
                />
                <Button size="sm" onClick={handleCreate}>Criar</Button>
                <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewName(""); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {groups.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Nenhum grupo ainda. Crie um grupo (ex: Moradia, Lazer) e arraste os itens da tabela para organizá-los.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {groups.map((g) => {
              const groupItems = itemsByGroup(g.id);
              const isOpen = openIds[g.id] ?? true;
              const isHover = hoverId === g.id;
              const status = groupStatus(g.id);
              const statusColor =
                status === "all_paid" ? "bg-green-500" : status === "pending" ? "bg-red-500" : "bg-slate-300";
              const statusTitle =
                status === "all_paid"
                  ? kind === "expense" ? "Todas as despesas pagas" : "Todas as receitas recebidas"
                  : status === "pending"
                    ? kind === "expense" ? "Existem despesas pendentes" : "Existem receitas pendentes"
                    : "Grupo vazio";
              return (
                <div
                  key={g.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggingId) setHoverId(g.id);
                  }}
                  onDragLeave={() => setHoverId(null)}
                  onDrop={(e) => handleDrop(e, g.id)}
                  className={cn(
                    "rounded-lg border bg-card transition-all",
                    isHover && "ring-2 ring-primary border-primary bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 p-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      onClick={() => setOpenIds((p) => ({ ...p, [g.id]: !isOpen }))}
                    >
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span
                        className={cn(
                          "w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-card",
                          statusColor,
                          status === "pending" && "animate-pulse ring-red-200",
                          status === "all_paid" && "ring-green-200",
                          status === "empty" && "ring-slate-200",
                        )}
                        title={statusTitle}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: g.color }}
                      />
                      <span className="font-medium text-sm truncate">{g.name}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {groupItems.length}
                      </Badge>
                    </button>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(totalByGroup(g.id))}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteGroup(g.id)}
                      title="Excluir grupo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {isOpen && (
                    <div className="border-t px-2 py-1.5 space-y-1 min-h-[32px]">
                      {groupItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-1 py-1">
                          Solte itens aqui
                        </p>
                      ) : (
                        groupItems.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between gap-2 text-xs px-1 py-1 rounded hover:bg-muted/50"
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                it.isPaid ? "bg-green-500" : "bg-red-400",
                              )}
                              title={it.isPaid ? (kind === "expense" ? "Pago" : "Recebido") : "Pendente"}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{it.primary}</p>
                              {it.secondary && (
                                <p className="text-muted-foreground truncate">{it.secondary}</p>
                              )}
                            </div>
                            <span className="tabular-nums font-medium">{formatCurrency(it.amount)}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => removeFromGroup(it.id)}
                              title="Remover do grupo"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { GripVertical };
