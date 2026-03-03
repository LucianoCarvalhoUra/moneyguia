import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Shield, Loader2, Bell, Bot, Sparkles } from 'lucide-react';
import UnifiedCategoryManager from '../components/settings/UnifiedCategoryManager';
import DashboardCustomization from '@/components/dashboard/DashboardCustomization';
import DeleteProfileDialog from '@/components/settings/DeleteProfileDialog';
import ChangePasswordForm from '@/components/settings/ChangePasswordForm';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { APP_VERSION, LAST_UPDATE } from '@/config/version';

interface Profile {
  name: string;
  email: string;
}

export default function Settings() {
  const { user, hasFeatureAccess, subscriptionStatus, subscriptionPlan, refreshProfile } = useAuth();
  const { expenses, updateExpense, categories } = useFinance();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alertDays, setAlertDays] = useState('2');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertType, setAlertType] = useState('expenses');
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSimulatingSubscription, setIsSimulatingSubscription] = useState(false);
  const canUseAiClassification = hasFeatureAccess('ai_classification');

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    const storedDays = localStorage.getItem('alert_days_before');
    if (storedDays) setAlertDays(storedDays);

    const storedEnabled = localStorage.getItem('alert_enabled');
    if (storedEnabled !== null) setAlertEnabled(storedEnabled === 'true');

    const storedType = localStorage.getItem('alert_type');
    if (storedType) setAlertType(storedType);
  }, []);

  const loadProfile = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    } else {
      // Fallback to auth user data
      setProfile({
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        email: user.email || '',
      });
    }
    setIsLoading(false);
  };

  const saveAlertSettings = (enabled: boolean, days: string, type: string) => {
    setAlertEnabled(enabled);
    setAlertDays(days);
    setAlertType(type);
    localStorage.setItem('alert_enabled', String(enabled));
    localStorage.setItem('alert_days_before', days);
    localStorage.setItem('alert_type', type);
    toast.success('Preferências de alerta atualizadas');
  };

  const handleClassifyExpenses = async () => {
    if (!canUseAiClassification) {
      toast.error('Recurso disponível apenas para planos Premium ou Controle Total');
      return;
    }

    setIsClassifying(true);
    try {
      // Simulação da IA (Heurística baseada em categorias para demonstração)
      // Em produção, isso chamaria uma Edge Function com GPT-4
      let updatedCount = 0;

      const updates = expenses.map(async (expense) => {
        // Skip if already classified manually or by AI
        if ((expense as any).classificationType && (expense as any).classificationType !== 'variavel') return;

        const category = categories.find(c => c.id === expense.categoryId);
        const catName = category?.name.toLowerCase() || '';

        let newType = 'variavel'; // Default

        // Heurística simples
        if (['aluguel', 'condomínio', 'luz', 'água', 'internet', 'saúde', 'educação'].some(k => catName.includes(k))) {
          newType = 'essencial';
        } else if (['lazer', 'restaurante', 'ifood', 'streaming', 'jogos'].some(k => catName.includes(k))) {
          newType = 'superfluo';
        } else if (['investimento', 'poupança', 'reserva'].some(k => catName.includes(k))) {
          newType = 'longo_prazo';
        }

        if (newType !== 'variavel') {
          updatedCount++;
          await updateExpense(expense.id, { classificationType: newType } as any);
        }
      });

      await Promise.all(updates);
      toast.success(`${updatedCount} despesas reclassificadas com Inteligência Artificial!`);
    } catch (_error) {
      toast.error('Erro ao classificar despesas');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSimulateSubscription = async (targetPlanType: 'free' | 'pro' | 'premium') => {
    if (!user?.id) return;
    setIsSimulatingSubscription(true);

    try {
      if (targetPlanType === 'free') {
        // Cancel any active subscription
        await supabase
          .from('user_subscriptions')
          .update({ status: 'canceled', expires_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .in('status', ['active', 'trial']);
      } else {
        // Get the target plan
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('id, name')
          .eq('plan_type', targetPlanType)
          .eq('is_active', true)
          .maybeSingle();

        if (!plan) {
          toast.error('Plano não encontrado');
          return;
        }

        // Upsert subscription (unique on user_id)
        const { error } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: user.id,
            plan_id: plan.id,
            status: 'active',
            billing_cycle: 'monthly',
            starts_at: new Date().toISOString(),
            expires_at: null,
          }, { onConflict: 'user_id' });
        if (error) throw error;
      }

      await refreshProfile();
      const labels: Record<string, string> = { free: 'Gratuito', pro: 'Pro', premium: 'Premium' };
      toast.success(`Plano simulado: ${labels[targetPlanType] || targetPlanType}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao simular assinatura');
    } finally {
      setIsSimulatingSubscription(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Perfil
          </CardTitle>
          <CardDescription>Informações da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={profile?.name || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={profile?.email || ''} disabled className="bg-muted" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Unified Categories Manager */}
      <UnifiedCategoryManager />

      {/* AI Intelligence */}
      <Card className={cn(
        'border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background',
        !canUseAiClassification && 'opacity-50',
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <Bot className="w-5 h-5" />
            Inteligência Financeira
          </CardTitle>
          <CardDescription>Use IA para organizar suas finanças automaticamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground max-w-[70%]">
              A IA analisará suas despesas e classificará automaticamente entre Essencial, Supérfluo e Longo Prazo.
            </p>
            <Button onClick={handleClassifyExpenses} disabled={isClassifying || !canUseAiClassification} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {!canUseAiClassification ? <Lock className="w-4 h-4 mr-2" /> : isClassifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Reclassificar com IA
            </Button>
          </div>
          {!canUseAiClassification && (
            <p className="mt-3 text-xs text-muted-foreground">Disponível apenas para planos Premium e Controle Total.</p>
          )}
        </CardContent>
      </Card>

      {/* Dashboard Customization */}
      <DashboardCustomization />

      {/* Smart Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notificações Inteligentes
          </CardTitle>
          <CardDescription>Configure seus alertas de vencimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label className="text-base">Alerta no Dashboard</Label>
              <p className="text-sm text-muted-foreground">
                Mostrar aviso de contas próximas do vencimento
              </p>
            </div>
            <Button
              className={cn(alertEnabled ? 'bg-primary hover:bg-primary/90' : 'bg-muted text-muted-foreground hover:bg-muted/80')}
              onClick={() => saveAlertSettings(!alertEnabled, alertDays, alertType)}
            >
              {alertEnabled ? 'Ativado' : 'Desativado'}
            </Button>
          </div>

          {alertEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Alertar sobre</Label>
                <Select value={alertType} onValueChange={(v) => saveAlertSettings(alertEnabled, alertDays, v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expenses">Apenas Despesas</SelectItem>
                    <SelectItem value="incomes">Apenas Receitas</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Antecedência (dias)</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={alertDays}
                  onChange={(e) => saveAlertSettings(alertEnabled, e.target.value, alertType)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Segurança
          </CardTitle>
          <CardDescription>
            Opções de segurança da conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChangePasswordForm />

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium">Teste de Assinatura (temporário)</h4>
            <p className="text-sm text-muted-foreground">
              Plano atual: <span className="font-semibold text-foreground">{subscriptionPlan === 'free' ? 'Gratuito' : subscriptionPlan === 'premium' ? 'Pro' : subscriptionPlan === 'total' ? 'Premium' : subscriptionPlan}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { type: 'free' as const, label: 'Gratuito' },
                { type: 'pro' as const, label: 'Pro' },
                { type: 'premium' as const, label: 'Premium' },
              ].map(({ type, label }) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSimulateSubscription(type)}
                  disabled={isSimulatingSubscription}
                  className={cn(
                    (subscriptionPlan === 'free' && type === 'free') ||
                    (subscriptionPlan === 'premium' && type === 'pro') ||
                    (subscriptionPlan === 'total' && type === 'premium')
                      ? 'border-primary bg-primary/10 text-primary'
                      : ''
                  )}
                >
                  {isSimulatingSubscription ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-destructive mb-2">Zona de Perigo</h4>
            <DeleteProfileDialog />
          </div>
        </CardContent>
      </Card>

      <div className="pt-1 text-center text-[10px] text-slate-400">
        v{APP_VERSION} • {LAST_UPDATE}
      </div>
    </div>
  );
}
