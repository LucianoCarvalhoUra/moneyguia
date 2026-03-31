import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Megaphone, MessageSquare, Star, Trash2 } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";

type Campaign = {
  id: string;
  name: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
};

type ResponseItem = {
  id: string;
  campaign_id: string;
  rating: number;
  comment: string | null;
  is_public: boolean;
  created_at: string;
};

export default function AdminCsat() {
  const [campaignName, setCampaignName] = useState("");
  const [campaignEndDate, setCampaignEndDate] = useState("");
  const [campaignIsActive, setCampaignIsActive] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [togglingCampaignId, setTogglingCampaignId] = useState<string | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [togglingPublicId, setTogglingPublicId] = useState<string | null>(null);

  const campaignMap = useMemo(() => {
    return campaigns.reduce<Record<string, string>>((acc, campaign) => {
      acc[campaign.id] = campaign.name;
      return acc;
    }, {});
  }, [campaigns]);

  const formatCampaignEndDate = (endDate?: string) => {
    if (!endDate) return "Sem data de término";

    const parsed = parseISO(endDate);
    if (!isValid(parsed)) return "Sem data de término";

    return `Termina em ${format(parsed, "dd/MM/yyyy")}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let campaignsResult = await supabase
        .from("csat_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (campaignsResult.error) {
        setCampaigns([]);
        toast.error(`Erro ao carregar campanhas CSAT: ${campaignsResult.error.message}`);
      } else {
        setCampaigns((campaignsResult.data as Campaign[]) || []);
      }

      let responsesResult = await supabase
        .from("csat_responses")
        .select("id, campaign_id, rating, comment, is_public, created_at")
        .order("created_at", { ascending: false });

      if (responsesResult.error) {
        setResponses([]);
        toast.error(`Erro ao carregar respostas CSAT: ${responsesResult.error.message}`);
      } else {
        setResponses((responsesResult.data as ResponseItem[]) || []);
      }
      console.log('[Sistema] Permissões carregadas com sucesso.');
    } catch (error: any) {
      toast.error(`Erro ao carregar CSAT: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCampaign = async (event: FormEvent) => {
    event.preventDefault();

    if (!campaignName.trim() || !campaignEndDate) {
      toast.error("Informe nome e data de término da campanha.");
      return;
    }

    setCreatingCampaign(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("Usuário autenticado não encontrado para created_by.");
      }

      // Envia apenas campos existentes na tabela csat_campaigns
      if (campaignIsActive) {
        const deactivateAll = await supabase.from("csat_campaigns").update({ is_active: false }).eq("is_active", true);
        if (deactivateAll.error) throw deactivateAll.error;
      }

      const campaignData = {
        name: campaignName.trim(),
        end_date: campaignEndDate,
        created_by: user.id,
        is_active: campaignIsActive,
      };

      console.log("[CSAT] Dados sendo enviados:", campaignData);

      try {
        const { error } = await supabase.from("csat_campaigns").insert(campaignData);
        if (error) throw error;
      } catch (error: any) {
        console.error("[CSAT Error]", error?.message, error?.details);
        throw error;
      }

      toast.success("Campanha CSAT criada com sucesso.");
      setCampaignName("");
      setCampaignEndDate("");
      setCampaignIsActive(false);
      await loadData();
    } catch (error: any) {
      toast.error(`Erro ao criar campanha: ${error.message}`);
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleToggleCampaign = async (campaign: Campaign) => {
    setTogglingCampaignId(campaign.id);
    try {
      if (campaign.is_active) {
        const { error } = await supabase
          .from("csat_campaigns")
          .update({ is_active: false })
          .eq("id", campaign.id);
        if (error) throw error;
        toast.success("Campanha desativada.");
      } else {
        const deactivateAll = await supabase.from("csat_campaigns").update({ is_active: false }).eq("is_active", true);
        if (deactivateAll.error) throw deactivateAll.error;

        const activateOne = await supabase
          .from("csat_campaigns")
          .update({ is_active: true })
          .eq("id", campaign.id);
        if (activateOne.error) throw activateOne.error;
        toast.success("Campanha ativada.");
      }

      await loadData();
    } catch (error: any) {
      toast.error(`Erro ao alterar status da campanha: ${error.message}`);
    } finally {
      setTogglingCampaignId(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha permanentemente?")) return;
    
    setDeletingCampaignId(campaignId);
    try {
      const { error } = await supabase.from("csat_campaigns").delete().eq("id", campaignId);
      if (error) throw error;
      
      toast.success("Campanha excluída com sucesso.");
      await loadData();
    } catch (error: any) {
      toast.error(`Erro ao excluir campanha: ${error.message}`);
    } finally {
      setDeletingCampaignId(null);
    }
  };

  const handleTogglePublic = async (response: ResponseItem) => {
    setTogglingPublicId(response.id);
    try {
      const { error } = await supabase
        .from("csat_responses")
        .update({ is_public: !response.is_public })
        .eq("id", response.id);

      if (error) throw error;

      setResponses((current) =>
        current.map((item) => (item.id === response.id ? { ...item, is_public: !item.is_public } : item)),
      );
      toast.success("Visibilidade do depoimento atualizada.");
    } catch (error: any) {
      toast.error(`Erro ao atualizar depoimento: ${error.message}`);
    } finally {
      setTogglingPublicId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuração de CSAT</h1>
        <p className="text-muted-foreground">Gerencie campanhas, respostas e depoimentos exibidos na Home.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Gestão de Campanhas
          </CardTitle>
          <CardDescription>Inicie novas campanhas e controle qual campanha está ativa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleCreateCampaign} className="space-y-4 rounded-xl border p-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Nome da campanha</Label>
                <Input
                  id="campaign-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex.: Abril 2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-end">Data de término</Label>
                <Input
                  id="campaign-end"
                  type="date"
                  value={campaignEndDate}
                  onChange={(e) => setCampaignEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Status inicial</p>
                  <p className="text-xs text-muted-foreground">Ativar campanha assim que criar</p>
                </div>
                <Switch checked={campaignIsActive} onCheckedChange={setCampaignIsActive} />
              </div>
              <Button type="submit" className="w-full" disabled={creatingCampaign}>
                {creatingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar campanha"}
              </Button>
            </form>

            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="mb-3 text-sm font-medium text-slate-700">Live Preview (Modal no Dashboard)</p>
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-3">
                <div className="w-full max-w-md rounded-3xl border border-white/40 bg-white/70 p-5 shadow-2xl backdrop-blur-xl">
                  <div className="space-y-5">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-slate-800">Pesquisa de satisfação</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {campaignName.trim() ? `Campanha: ${campaignName.trim()}` : "Como você avalia sua experiência hoje?"}
                      </p>
                    </div>

                    <div>
                      <p className="mb-3 text-center text-sm font-medium text-slate-700">Como você avalia sua experiência hoje?</p>
                      <div className="grid grid-cols-5 gap-2">
                        {["😡", "🙁", "😐", "🙂", "😍"].map((emoji) => (
                          <div key={emoji} className="rounded-2xl border border-slate-200 bg-white/70 p-2 text-center text-3xl transition-all duration-300 hover:-translate-y-2 hover:drop-shadow-[0_0_14px_rgba(16,185,129,0.45)]">
                            {emoji}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm text-slate-400">
                      Quer nos contar o motivo? (Opcional)
                    </div>

                    <div className="rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg">
                      Enviar avaliação
                    </div>

                    <div className="text-center text-xs text-slate-500">
                      Status ao criar: {campaignIsActive ? "Ativa" : "Inativa"}
                      {campaignEndDate ? ` • Encerra em ${format(new Date(`${campaignEndDate}T00:00:00`), "dd/MM/yyyy")}` : ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando campanhas...
              </div>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma campanha cadastrada.</p>
            ) : (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">{formatCampaignEndDate(campaign.end_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={campaign.is_active ? "default" : "secondary"}>
                      {campaign.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                    <Button
                      variant="outline"
                      onClick={() => handleToggleCampaign(campaign)}
                      disabled={togglingCampaignId === campaign.id}
                    >
                      {togglingCampaignId === campaign.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : campaign.is_active ? (
                        "Desativar"
                      ) : (
                        "Ativar"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      disabled={deletingCampaignId === campaign.id}
                    >
                      {deletingCampaignId === campaign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Dashboard CSAT (Respostas)
          </CardTitle>
          <CardDescription>Visualize notas e comentários e publique os melhores depoimentos na Home.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando respostas...
            </div>
          ) : responses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não existem respostas CSAT.</p>
          ) : (
            <div className="space-y-3">
              {responses.map((response) => (
                <div key={response.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`h-4 w-4 ${index < response.rating ? "fill-amber-400 text-amber-500" : "text-slate-300"}`}
                        />
                      ))}
                      <span className="ml-1 text-sm font-medium text-foreground">{response.rating}/5</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Campanha: {campaignMap[response.campaign_id] || "N/A"}
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-foreground">{response.comment || "(Sem comentário)"}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(response.created_at).toLocaleString("pt-BR")}
                    </span>

                    <div className="flex items-center gap-2">
                      <Label htmlFor={`is-public-${response.id}`} className="text-sm">
                        Publicar na Home
                      </Label>
                      <Switch
                        id={`is-public-${response.id}`}
                        checked={response.is_public}
                        disabled={togglingPublicId === response.id}
                        onCheckedChange={() => handleTogglePublic(response)}
                      />
                    </div>
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
