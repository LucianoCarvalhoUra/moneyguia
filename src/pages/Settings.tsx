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
import { User, Shield, Loader2, Bell, Bot, Sparkles, CalendarClock, Mail, Send } from 'lucide-react';
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
  const [notificationEmail, setNotificationEmail] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

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

    // Load email notification settings
    const { data: notifSettings } = await (supabase.from('notification_settings') as any)
      .select('notification_email, email_enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    if (notifSettings) {
      setNotificationEmail(notifSettings.notification_email || user?.email || '');
      setEmailEnabled(notifSettings.email_enabled ?? false);
    } else {
      setNotificationEmail(user?.email || '');
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

  const saveEmailSettings = async (email: string, enabled: boolean) => {
    if (!user?.id) return;
    setIsSavingEmail(true);
    try {
      const { data: existing } = await (supabase.from('notification_settings') as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await (supabase.from('notification_settings') as any)
          .update({ notification_email: email, email_enabled: enabled })
          .eq('user_id', user.id);
      } else {
        await (supabase.from('notification_settings') as any)
          .insert({ user_id: user.id, notification_email: email, email_enabled: enabled });
      }
      setNotificationEmail(email);
      setEmailEnabled(enabled);
      toast.success('Configurações de email salvas');
    } catch {
      toast.error('Erro ao salvar configurações de email');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const sendTestEmail = async () => {
    if (!user) return;
    setIsSendingTest(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) { toast.error('Sessão inválida'); return; }

      const res = await supabase.functions.invoke('send-test-alert', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.error) {
        toast.error(`Erro: ${res.error.message}`);
      } else if (res.data?.success) {
        toast.success(`Email de teste enviado para ${res.data.sentTo}`);
      } else {
        toast.error(res.data?.error || 'Erro desconhecido');
      }
    } catch (e: any) {
      toast.error(`Erro ao enviar: ${e.message}`);
    } finally {
      setIsSendingTest(false);
    }
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

          {/* Email alerts section */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <Label className="text-base">Alertas por Email</Label>
              </div>
              <Switch
                checked={emailEnabled}
                onCheckedChange={(checked) => saveEmailSettings(notificationEmail, checked)}
                disabled={isSavingEmail}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Receba lembretes de despesas próximas do vencimento por email.
            </p>
            {emailEnabled && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Email para receber alertas</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => saveEmailSettings(notificationEmail, emailEnabled)}
                      disabled={isSavingEmail}
                    >
                      {isSavingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                    </Button>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto gap-2"
                  onClick={sendTestEmail}
                  disabled={isSendingTest || !notificationEmail}
                >
                  {isSendingTest
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                    : <><Send className="w-4 h-4" /> Enviar email de teste</>
                  }
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
