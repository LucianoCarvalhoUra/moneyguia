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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CLOSE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const OPEN_DELAY_MS = 5000;

const ratingOptions = [
  { value: 1, emoji: "😡", label: "Muito ruim" },
  { value: 2, emoji: "🙁", label: "Ruim" },
  { value: 3, emoji: "😐", label: "Neutro" },
  { value: 4, emoji: "🙂", label: "Bom" },
  { value: 5, emoji: "😍", label: "Excelente" },
];

export default function CsatSurvey() {
  const { user, isAdmin, isRoleLoading } = useAuth();
  const [activeCampaign, setActiveCampaign] = useState<{ id: string; name?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let openTimer: ReturnType<typeof setTimeout> | null = null;

    const campaignStorageScope = (campaignId: string) => `${campaignId}:${user?.id || "anonymous"}`;
    const respondedKey = (campaignId: string) => `csat_responded_${campaignStorageScope(campaignId)}`;
    const snoozeKey = (campaignId: string) => `csat_dismissed_until_${campaignStorageScope(campaignId)}`;

    const loadCampaign = async () => {
      if (!user?.id || isRoleLoading) return;

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
        if (error?.status === 500 || error?.code === "500") {
          window.alert("Erro de permissão no banco");
        }
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
      const localResponded = localStorage.getItem(respondedKey(campaign.id)) === "true";
      const dismissedUntil = Number(localStorage.getItem(snoozeKey(campaign.id)) || "0");
      const stillInDismissWindow = Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();

      if (localResponded || stillInDismissWindow) {
        setOpen(false);
        return;
      }

      const { data: existingResponse, error: existingError } = await (supabase
        .from("csat_responses")
        .select("id") as any)
        .eq("campaign_id", campaign.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) {
        if (existingError?.status === 500 || existingError?.code === "500") {
          window.alert("Erro de permissão no banco");
        }
        toast.error("Erro ao validar status da pesquisa.");
        setActiveCampaign(null);
        setOpen(false);
        return;
      }

      if (existingResponse) {
        localStorage.setItem(respondedKey(campaign.id), "true");
        setOpen(false);
        return;
      }

      setActiveCampaign(campaign);
      openTimer = setTimeout(() => {
        setOpen(true);
      }, OPEN_DELAY_MS);
    };

    loadCampaign();

    return () => {
      if (openTimer) clearTimeout(openTimer);
    };
  }, [user?.id, isAdmin, isRoleLoading]);

  const handleSend = async () => {
    if (!activeCampaign || !rating || !user?.id) {
      toast.error("Selecione uma opção para continuar.");
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

      localStorage.setItem(`csat_responded_${activeCampaign.id}:${user.id}`, "true");
      setOpen(false);
      setRating(null);
      setComment("");
      toast.success("Obrigado pelo seu feedback!");
    } catch (error: any) {
      if (error?.status === 500 || error?.code === "500") {
        window.alert("Erro de permissão no banco");
      }
      if (error?.code === "23505") {
        toast.info("Você já avaliou esta campanha! Obrigado.");
        localStorage.setItem(`csat_responded_${activeCampaign.id}:${user.id}`, "true");
        setOpen(false);
        return;
      }
      toast.error(error?.message || "Erro ao enviar avaliação.");
    } finally {
      setSending(false);
    }
  };

  const handleCloseWithSnooze = () => {
    if (!activeCampaign?.id || !user?.id) return;
    const key = `csat_dismissed_until_${activeCampaign.id}:${user.id}`;
    localStorage.setItem(key, String(Date.now() + CLOSE_COOLDOWN_MS));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCloseWithSnooze();
        }
        setOpen(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg rounded-2xl border border-white/30 bg-white/80 backdrop-blur-md shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-800">Pesquisa de satisfação</DialogTitle>
          <DialogDescription>
            {activeCampaign?.name
              ? `Campanha: ${activeCampaign.name}`
              : "Como está sua experiência com o MoneyGuia?"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">Como você avalia sua experiência hoje?</p>
            <div className="grid grid-cols-5 gap-2">
              {ratingOptions.map((option) => {
                const selected = rating === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRating(option.value)}
                    className={`group rounded-2xl border p-2 transition-all duration-300 ${
                      selected
                        ? "bg-emerald-100 border-emerald-300 shadow-md"
                        : "bg-white/60 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/70"
                    }`}
                  >
                    <span className="block text-3xl text-center transition-all duration-300 group-hover:scale-125 group-hover:drop-shadow-[0_0_10px_rgba(16,185,129,0.45)]">
                      {option.emoji}
                    </span>
                  </button>
                );
              })}
            </div>
            {rating && (
              <p className="text-xs text-slate-500 mt-2">
                {ratingOptions.find((item) => item.value === rating)?.label}
              </p>
            )}
          </div>

          {rating && (
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Quer nos contar o motivo? (Opcional)"
                className="min-h-[90px] rounded-xl border-slate-200 bg-white/70"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || !rating}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg hover:from-emerald-600 hover:to-cyan-600"
          >
            {sending ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}