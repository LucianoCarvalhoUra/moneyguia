import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CsatSurvey() {
  const { user } = useAuth();
  const { isAdmin, isCheckingAdmin } = useIsAdmin();
  const [activeCampaign, setActiveCampaign] = useState<{ id: string; name?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadCampaign = async () => {
      if (!user?.id || isCheckingAdmin) return;

      if (isAdmin) {
        setActiveCampaign(null);
        setOpen(false);
        return;
      }

      const { data, error } = await supabase
        .from("csat_campaigns")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) {
        const noActiveCampaign = error.code === "PGRST116";
        if (!noActiveCampaign) {
          toast.error("Erro ao carregar campanha de pesquisa.");
        }
        setActiveCampaign(null);
        setOpen(false);
        return;
      }

      if (!data) {
        setActiveCampaign(null);
        setOpen(false);
        return;
      }

      const now = new Date();
      const endDate = data.end_date ? new Date(`${data.end_date}T23:59:59`) : null;
      const startDateRaw = (data as any).start_date ?? data.created_at;
      const startDate = startDateRaw ? new Date(startDateRaw) : null;

      const isWithinWindow =
        Boolean(endDate && !Number.isNaN(endDate.getTime()) && now <= endDate) &&
        (!startDate || !Number.isNaN(startDate.getTime()) ? now >= (startDate || now) : true);

      if (!isWithinWindow) {
        setActiveCampaign(null);
        setOpen(false);
        return;
      }

      const campaign = data as { id: string; name?: string };
      const dismissedKey = `csat_dismissed_${campaign.id}`;
      const wasDismissed = localStorage.getItem(dismissedKey) === "true";

      const { data: existingResponse, error: existingError } = await (supabase
        .from("csat_responses")
        .select("id") as any)
        .eq("campaign_id", campaign.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) {
        toast.error("Erro ao validar status da pesquisa.");
        setActiveCampaign(null);
        setOpen(false);
        return;
      }

      if (existingResponse || wasDismissed) {
        setOpen(false);
        return;
      }

      setActiveCampaign(campaign);
      setOpen(true);
    };

    loadCampaign();
  }, [user?.id, isAdmin, isCheckingAdmin]);

  const handleSend = async () => {
    if (!activeCampaign || !rating || !user?.id) {
      toast.error("Selecione uma nota de 1 a 5.");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("csat_responses").insert({
        campaign_id: activeCampaign.id,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      localStorage.setItem(`csat_dismissed_${activeCampaign.id}`, "true");
      setOpen(false);
      toast.success("Obrigado pelo seu feedback!");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao enviar avaliação.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && activeCampaign?.id) {
          localStorage.setItem(`csat_dismissed_${activeCampaign.id}`, "true");
        }
        setOpen(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pesquisa de satisfação</DialogTitle>
          <DialogDescription>
            {activeCampaign?.name
              ? `Campanha: ${activeCampaign.name}`
              : "Como está sua experiência com o MoneyGuia?"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button
                key={value}
                type="button"
                variant={rating === value ? "default" : "outline"}
                size="sm"
                className="min-w-9"
                onClick={() => setRating(value)}
              >
                {value}
              </Button>
            ))}
          </div>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Quer deixar um comentário? (opcional)"
            className="min-h-[90px]"
          />
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSend} disabled={sending || !rating}>
            {sending ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}