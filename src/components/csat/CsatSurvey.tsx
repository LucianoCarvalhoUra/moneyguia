import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

const CLOSE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const OPEN_DELAY_MS = 5000;

const ratingOptions = [
  { value: 1, emoji: "😡", label: "Muito ruim" },
  { value: 2, emoji: "🙁", label: "Ruim" },
  { value: 3, emoji: "😐", label: "Neutro" },
  { value: 4, emoji: "🙂", label: "Bom" },
  { value: 5, emoji: "😍", label: "Excelente" },
];

const isPermissionError = (error: { code?: string | null; message?: string | null } | null | undefined) => {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  return code === "500" || code === "42501" || message.includes("permission") || message.includes("internal server error");
};

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
        .select("id, name")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        const noActiveCampaign = error.code === "PGRST116";
        if (isPermissionError(error)) {
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
        if (isPermissionError(existingError)) {
          window.alert("Erro de permissão no banco");
        }
        toast.error("Erro ao validar status da pesquisa.");
        setActiveCampaign(null);
        setOpen(false);
        return;
      }

      if (existingResponse) {
        localStorage.setItem(respondedKey(campaign.id), "true");
        console.log("[CSAT Flow]", { campaign, userResponse: existingResponse, now: new Date() });
        setOpen(false);
        return;
      }

      console.log("[CSAT Flow]", { campaign, userResponse: existingResponse, now: new Date() });

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
      if (isPermissionError(error)) {
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
    open ? (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
        <div className="relative w-full max-w-xl rounded-3xl border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in-0 slide-in-from-bottom-4 duration-300 sm:p-7">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            onClick={() => {
              handleCloseWithSnooze();
              setOpen(false);
            }}
            aria-label="Fechar pesquisa"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-800">Pesquisa de satisfação</h2>
              <p className="mt-1 text-sm text-slate-600">
                {activeCampaign?.name
                  ? `Campanha: ${activeCampaign.name}`
                  : "Como você avalia sua experiência hoje?"}
              </p>
            </div>

            <div>
              <p className="mb-3 text-center text-sm font-medium text-slate-700">Como você avalia sua experiência hoje?</p>
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {ratingOptions.map((option) => {
                  const selected = rating === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRating(option.value)}
                      className={`group rounded-2xl border p-2 transition-all duration-300 ${
                        selected
                          ? "border-emerald-300 bg-emerald-100 shadow-md"
                          : "border-slate-200 bg-white/60 hover:border-emerald-200 hover:bg-emerald-50/70"
                      }`}
                    >
                      <span className="block text-center text-4xl transition-all duration-300 group-hover:-translate-y-2 group-hover:drop-shadow-[0_0_14px_rgba(16,185,129,0.5)]">
                        {option.emoji}
                      </span>
                    </button>
                  );
                })}
              </div>

              {rating && (
                <p className="mt-2 text-center text-xs text-slate-500">
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
                  className="min-h-[100px] rounded-2xl border-slate-200 bg-white/80"
                />
              </div>
            )}

            <Button
              type="button"
              onClick={handleSend}
              disabled={sending || !rating}
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 text-white shadow-lg hover:brightness-110"
            >
              {sending ? "Enviando..." : "Enviar avaliação"}
              {!sending && <Check className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    ) : null
  );
}