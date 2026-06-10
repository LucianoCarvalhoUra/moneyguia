import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, FolderPlus, Trash2, X, GripVertical, Copy } from "lucide-react";
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
}

interface GroupsPanelProps {
  kind: "expense" | "income";
  items: GroupedItem[];
  onChanged: () => void;
  draggingId: string | null;
  selectedMonth: number;
  selectedYear: number;
}

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

// Strips installment suffix like " - 2/10" or " (3/8)" before comparing names
const normalizeName = (name: string) =>
  name
    .replace(/\s*[-–]\s*\d+\/\d+\s*$/, "")
    .replace(/\s*\(\d+\/\d+\)\s*$/, "")
    .trim()
    .toLowerCase();

export default function GroupsPanel({ kind, items, onChanged, draggingId, selectedMonth, selectedYear }: GroupsPanelProps) {
  const { user } = useAuth();
  const table = kind === "expense" ? "expenses" : "incomes";
  const [groups, setGroups] = useState<TransactionGroup[]>([]);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [replicating, setReplicating] = useState(false);

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

  const handleReplicate = async () => {
    if (!user || groups.length === 0) return;

    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

    const startStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
    const endStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const dateField = kind === "expense" ? "due_date" : "receive_date";
    const nameField = kind === "expense" ? "description" : "title";

    setReplicating(true);
    try {
      const { data: prevItems, error } = await (supabase.from(table) as any)
        .select(`id, ${nameField}, group_id`)
        .eq("user_id", user.id)
        .not("group_id", "is", null)
        .gte(dateField, startStr)
        .lte(dateField, endStr);

      if (error) {
        toast.error("Erro ao buscar dados do mês anterior");
        return;
      }

      if (!prevItems?.length) {
        toast.info("Nenhum agrupamento encontrado no mês anterior.");
        return;
      }

      // Build normalized name → group_id map from previous month
      const nameToGroup = new Map<string, string>();
      for (const item of prevItems) {
        const name = normalizeName(item[nameField] || "");
        if (name && item.group_id) nameToGroup.set(name, item.group_id);
      }

      // Match current month's ungrouped items
      const ungroupedItems = items.filter((i) => !i.groupId);
      const updates: { id: string; groupId: string }[] = [];

      for (const item of ungroupedItems) {
        const name = normalizeName(item.primary);
        const groupId = nameToGroup.get(name);
        if (groupId && groups.find((g) => g.id === groupId)) {
          updates.push({ id: item.id, groupId });
        }
      }

      if (updates.length === 0) {
        toast.info("Nenhum item compatível encontrado para replicar.");
        return;
      }

      await Promise.all(
        updates.map(({ id, groupId }) =>
          (supabase.from(table) as any).update({ group_id: groupId }).eq("id", id)
        )
      );

      toast.success(`${updates.length} item(s) replicado(s) com sucesso!`);
      onChanged();
    } finally {
      setReplicating(false);
    }
  };

  const itemsByGroup = (gid: string) => items.filter((i) => i.groupId === gid);
  const totalByGroup = (gid: string) => itemsByGroup(gid).reduce((s, i) => s + i.amount, 0);

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Agrupamentos</h3>
            <span className="text-xs text-muted-foreground">
              Arraste itens da lista abaixo para um grupo
            </span>
          </div>
          <div className="flex items-center gap-2">
            {groups.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReplicate}
                      disabled={replicating}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      {replicating ? "Replicando..." : "Replicar mês anterior"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Associa automaticamente os itens deste mês aos mesmos grupos do mês anterior, comparando os nomes.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
