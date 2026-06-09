import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { User, Shield, Loader2, Bell, Bot, Sparkles, CalendarClock } from 'lucide-react';
import UnifiedCategoryManager from '../components/settings/UnifiedCategoryManager';
import EmailSmtpSettings from '@/components/settings/EmailSmtpSettings';
import NotificationAlertsSettings from '@/components/settings/NotificationAlertsSettings';
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
  const { user, hasFeatureAccess } = useAuth();
  const { expenses, updateExpense, categories } = useFinance();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alertDays, setAlertDays] = useState('2');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertType, setAlertType] = useState('expenses');
  const [isClassifying, setIsClassifying] = useState(false);
  const canUseAiClassification = hasFeatureAccess('ai_classification');
  const [autoLiquidation, setAutoLiquidation] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  // Seed category metadata with proper classification/recurrence
  useEffect(() => {
    const CATEGORY_CLASSIFICATIONS: Record<string, { classification: string; recurrence: string }> = {
      'Moradia': { classification: 'essencial', recurrence: 'fixa' },
      'Contas Básicas': { classification: 'essencial', recurrence: 'fixa' },
      'Dependentes': { classification: 'essencial', recurrence: 'fixa' },
      'Pessoal': { classification: 'superfluo', recurrence: 'fixa' },
      'Taxa Administração': { classification: 'essencial', recurrence: 'fixa' },
      'Transporte': { classification: 'essencial', recurrence: 'fixa' },
      'Moradia - Uberaba': { classification: 'essencial', recurrence: 'fixa' },
      'Cartão': { classification: 'superfluo', recurrence: 'variavel' },
      'Chamada de Capital': { classification: 'longo_prazo', recurrence: 'variavel' },
      'Fundo de reserva': { classification: 'longo_prazo', recurrence: 'variavel' },
      'Benfeitorias': { classification: 'essencial', recurrence: 'variavel' },
      'Doações': { classification: 'superfluo', recurrence: 'variavel' },
      'IPTU': { classification: 'essencial', recurrence: 'fixa' },
      'Taxa de Condomínio': { classification: 'essencial', recurrence: 'fixa' },
      'Despesas do Apartamento': { classification: 'essencial', recurrence: 'variavel' },
      'Outros Gastos': { classification: 'superfluo', recurrence: 'variavel' },
    };

    const existing = JSON.parse(localStorage.getItem('category_metadata') || '{}');
    let updated = false;
    for (const [name, meta] of Object.entries(CATEGORY_CLASSIFICATIONS)) {
      if (!existing[name]) {
        existing[name] = meta;
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem('category_metadata', JSON.stringify(existing));
    }
  }, []);

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

    const { data } = await (supabase
      .from('profiles') as any)
      .select('name, email, auto_liquidation')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setAutoLiquidation(data.auto_liquidation || false);
    } else {
      setProfile({
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        email: user.email || '',
      });
    }
    setIsLoading(false);
  };

  const handleAutoLiquidationChange = async (checked: boolean) => {
    setAutoLiquidation(checked);
    if (!user?.id) return;
    const { error } = await (supabase.from('profiles') as any)
      .update({ auto_liquidation: checked })
      .eq('user_id', user.id);
    if (error) {
      toast.error('Erro ao salvar preferência');
      setAutoLiquidation(!checked);
    } else {
      toast.success(checked ? 'Baixa automática ativada' : 'Baixa automática desativada');
    }
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
      let updatedCount = 0;

      const updates = expenses.map(async (expense) => {
        if ((expense as any).classificationType && (expense as any).classificationType !== 'variavel') return;

        const category = categories.find(c => c.id === expense.categoryId);
        const catName = category?.name.toLowerCase() || '';

        let newType = 'variavel';

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
      <Card className="border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-background">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Bell className="w-5 h-5" />
                Notificações Inteligentes
              </CardTitle>
              <CardDescription className="mt-1">
                Aviso visual no Dashboard sobre contas próximas do vencimento. Não envia e-mails.
              </CardDescription>
            </div>
            <Switch
              checked={alertEnabled}
              onCheckedChange={(c) => saveAlertSettings(c, alertDays, alertType)}
            />
          </div>
        </CardHeader>

        {alertEnabled && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Alertar sobre
                </Label>
                <Select
                  value={alertType}
                  onValueChange={(v) => saveAlertSettings(alertEnabled, alertDays, v)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expenses">Apenas Despesas</SelectItem>
                    <SelectItem value="incomes">Apenas Receitas</SelectItem>
                    <SelectItem value="both">Despesas e Receitas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Antecedência
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={alertDays}
                    onChange={(e) => saveAlertSettings(alertEnabled, e.target.value, alertType)}
                    className="bg-background pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    dias
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Bell className="w-3 h-3" />
              Você será avisado no Dashboard com até <strong>{alertDays}</strong> dia(s) de antecedência.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Email alerts (conteúdo + frequência) */}
      <NotificationAlertsSettings />

      {/* Auto-liquidation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Agendamentos
          </CardTitle>
          <CardDescription>Configure o comportamento dos agendamentos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label className="text-base">Baixa Automática</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativada, despesas e receitas agendadas serão efetivadas automaticamente na data do agendamento. Caso contrário, a efetivação será manual.
              </p>
            </div>
            <Switch checked={autoLiquidation} onCheckedChange={handleAutoLiquidationChange} />
          </div>
        </CardContent>
      </Card>

      {/* Email SMTP */}
      <EmailSmtpSettings />

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
