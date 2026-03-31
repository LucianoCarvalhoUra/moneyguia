import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Megaphone, MessageSquare, Star } from "lucide-react";

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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [togglingCampaignId, setTogglingCampaignId] = useState<string | null>(null);
  const [togglingPublicId, setTogglingPublicId] = useState<string | null>(null);

  const campaignMap = useMemo(() => {
    return campaigns.reduce<Record<string, string>>((acc, campaign) => {
      acc[campaign.id] = campaign.name;
      return acc;
    }, {});
  }, [campaigns]);

  const loadData = async () => {
    setLoading(true);
    try {
      let campaignsResult = await supabase
        .from("csat_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (campaignsResult.error) {
        console.warn("[CSAT] Falha ao ordenar campanhas por created_at, tentando sem order...");
        campaignsResult = await supabase.from("csat_campaigns").select("*");
      }

      if (campaignsResult.error) {
        console.error("[CSAT Error]", campaignsResult.error?.message, campaignsResult.error?.details);
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
        console.warn("[CSAT] Falha ao ordenar respostas por created_at, tentando sem order...");
        responsesResult = await supabase
          .from("csat_responses")
          .select("id, campaign_id, rating, comment, is_public, created_at");
      }

      if (responsesResult.error) {
        console.error("[CSAT Error]", responsesResult.error?.message, responsesResult.error?.details);
        setResponses([]);
        toast.error(`Erro ao carregar respostas CSAT: ${responsesResult.error.message}`);
      } else {
        setResponses((responsesResult.data as ResponseItem[]) || []);
      }
    } catch (error: any) {
      console.error("[CSAT Error]", error?.message, error?.details);
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
      const campaignData = {
        name: campaignName.trim(),
        end_date: campaignEndDate,
        created_by: user.id,
        is_active: false,
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
          <form onSubmit={handleCreateCampaign} className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
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
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={creatingCampaign}>
                {creatingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar campanha"}
              </Button>
            </div>
          </form>

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
                    <p className="text-sm text-muted-foreground">
                      {campaign.end_date
                        ? `Termina em ${new Date(campaign.end_date + "T00:00:00").toLocaleDateString("pt-BR")}`
                        : "Sem data de término"}
                    </p>
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
