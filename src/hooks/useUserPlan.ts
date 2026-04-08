import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanType = "free" | "pro" | "premium";

export interface SubscriptionInfo {
  startsAt: string | null;
  expiresAt: string | null;
  billingCycle: string;
  status: string;
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean;
}

const deriveExpiresAt = (
  startsAt: string | null,
  billingCycle: string | null,
): string | null => {
  if (!startsAt || !billingCycle) return null;

  const base = new Date(startsAt);
  if (Number.isNaN(base.getTime())) return null;

  if (billingCycle === "yearly") {
    base.setFullYear(base.getFullYear() + 1);
  } else {
    base.setMonth(base.getMonth() + 1);
  }

  return Number.isNaN(base.getTime()) ? null : base.toISOString();
};

export interface PlanLimits {
  planType: PlanType;
  planName: string;
  maxExpensesPerMonth: number | null;
  maxIncomesPerMonth: number | null;
  maxCategories: number | null;
  maxCreditCards: number | null;
  maxBankAccounts: number | null;
  hasAiClassification: boolean;
  hasAdvancedReports: boolean;
  hasExport: boolean;
  hasGoals: boolean;
  hasNotifications: boolean;
}

const FREE_DEFAULTS: PlanLimits = {
  planType: "free",
  planName: "Plano Gratuito",
  maxExpensesPerMonth: 30,
  maxIncomesPerMonth: 10,
  maxCategories: 5,
  maxCreditCards: 1,
  maxBankAccounts: 1,
  hasAiClassification: false,
  hasAdvancedReports: false,
  hasExport: false,
  hasGoals: false,
  hasNotifications: true,
};

const calculateDaysUntilExpiration = (expiresAt: string | null): number | null => {
  if (!expiresAt) {
    return null;
  }

  const now = new Date();
  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) {
    return null;
  }

  const diffInDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (!Number.isFinite(diffInDays)) {
    return null;
  }

  return diffInDays;
};

export function useUserPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanLimits>(FREE_DEFAULTS);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("user-plan-changed", handler);
    return () => window.removeEventListener("user-plan-changed", handler);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setPlan(FREE_DEFAULTS);
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    const fetchPlan = async () => {
      setIsLoading(true);
      try {
        const { data: sub, error } = await supabase
          .from("user_subscriptions")
          .select("*, subscription_plans(*)")
          .eq("user_id", user.id)
          .in("status", ["active", "trial"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        ("[Assinatura] Dados recuperados:", sub);

        if (error) {
          throw error;
        }

        if (sub?.subscription_plans) {
          const sp = sub.subscription_plans as any;
          const resolvedExpiresAt =
            sub.expires_at ?? deriveExpiresAt(sub.starts_at ?? null, sub.billing_cycle ?? null);

          // Check if subscription has expired
          let daysUntilExpiration: number | null = null;
          let isExpiringSoon = false;
          const isExpired = resolvedExpiresAt ? new Date(resolvedExpiresAt) <= new Date() : false;

          daysUntilExpiration = calculateDaysUntilExpiration(resolvedExpiresAt);
          isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 5 && daysUntilExpiration > 0;

          setSubscription({
            startsAt: sub.starts_at ?? null,
            expiresAt: resolvedExpiresAt,
            billingCycle: sub.billing_cycle ?? "monthly",
            status: sub.status,
            daysUntilExpiration,
            isExpiringSoon,
          });

          if (isExpired) {
            // Subscription expired — fallback to free
            setPlan(FREE_DEFAULTS);
          } else {
            setPlan({
              planType: sp.plan_type,
              planName: sp.name,
              maxExpensesPerMonth: sp.max_expenses_per_month,
              maxIncomesPerMonth: sp.max_incomes_per_month,
              maxCategories: sp.max_categories,
              maxCreditCards: sp.max_credit_cards,
              maxBankAccounts: sp.max_bank_accounts,
              hasAiClassification: sp.has_ai_classification,
              hasAdvancedReports: sp.has_advanced_reports,
              hasExport: sp.has_export,
              hasGoals: sp.has_goals,
              hasNotifications: sp.has_notifications,
            });
          }
        } else {
          setPlan(FREE_DEFAULTS);
          setSubscription(null);
        }
      } catch {
        setPlan(FREE_DEFAULTS);
        setSubscription(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [user?.id, refreshKey]);

  const canAccess = (feature: keyof Pick<PlanLimits, "hasAiClassification" | "hasAdvancedReports" | "hasExport" | "hasGoals" | "hasNotifications">) => {
    return plan[feature];
  };

  const isWithinLimit = (current: number, limitKey: keyof Pick<PlanLimits, "maxExpensesPerMonth" | "maxIncomesPerMonth" | "maxCategories" | "maxCreditCards" | "maxBankAccounts">) => {
    const limit = plan[limitKey];
    if (limit === null) return true;
    return current < limit;
  };

  return { plan, subscription, isLoading, canAccess, isWithinLimit };
}
