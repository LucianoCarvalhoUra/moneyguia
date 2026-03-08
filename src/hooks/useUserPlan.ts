import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanType = "free" | "pro" | "premium";

export interface SubscriptionInfo {
  expiresAt: string | null;
  billingCycle: string;
  status: string;
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean; // true if <= 5 days
}

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

export function useUserPlan() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener("user-plan-changed", handler);
    return () => window.removeEventListener("user-plan-changed", handler);
  }, []);

  useEffect(() => {
    if (!user) {
      setPlan(FREE_DEFAULTS);
      setIsLoading(false);
      return;
    }

    const fetchPlan = async () => {
      setIsLoading(true);
      try {
        // Get user subscription with plan details
        const { data: sub } = await supabase
          .from("user_subscriptions")
          .select("*, subscription_plans(*)")
          .eq("user_id", user.id)
          .in("status", ["active", "trial"])
          .maybeSingle();

        if (sub?.subscription_plans) {
          const sp = sub.subscription_plans as any;
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
        } else {
          setPlan(FREE_DEFAULTS);
        }
      } catch {
        setPlan(FREE_DEFAULTS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlan();
  }, [user, refreshKey]);

  const canAccess = (feature: keyof Pick<PlanLimits, "hasAiClassification" | "hasAdvancedReports" | "hasExport" | "hasGoals" | "hasNotifications">) => {
    return plan[feature];
  };

  const isWithinLimit = (current: number, limitKey: keyof Pick<PlanLimits, "maxExpensesPerMonth" | "maxIncomesPerMonth" | "maxCategories" | "maxCreditCards" | "maxBankAccounts">) => {
    const limit = plan[limitKey];
    if (limit === null) return true; // unlimited
    return current < limit;
  };

  return { plan, isLoading, canAccess, isWithinLimit };
}
