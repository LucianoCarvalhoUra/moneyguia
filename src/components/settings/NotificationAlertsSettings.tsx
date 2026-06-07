import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Loader2, Save, Send, AlertTriangle, Calendar, Wallet, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Settings {
  is_enabled: boolean;
  email_enabled: boolean;
  notification_email: string;
  days_before_due: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  send_hour: number;
  alert_overdue_expenses: boolean;
  alert_upcoming_expenses: boolean;
  alert_pending_incomes: boolean;
  alert_received_incomes: boolean;
}

const DEFAULTS: Settings = {
  is_enabled: true,
  email_enabled: true,
  notification_email: '',
  days_before_due: 3,
  frequency: 'daily',
  send_hour: 9,
  alert_overdue_expenses: true,
  alert_upcoming_expenses: true,
  alert_pending_incomes: false,
  alert_received_incomes: false,
};

export default function NotificationAlertsSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase
        .from('notification_settings') as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setSettings({
          is_enabled: data.is_enabled ?? true,
          email_enabled: data.email_enabled ?? true,
          notification_email: data.notification_email || user.email || '',
          days_before_due: data.days_before_due ?? 3,
          frequency: (data.frequency as Settings['frequency']) || 'daily',
          send_hour: typeof data.send_hour === 'number' ? data.send_hour : 9,
          alert_overdue_expenses: data.alert_overdue_expenses ?? true,
          alert_upcoming_expenses: data.alert_upcoming_expenses ?? true,
          alert_pending_incomes: data.alert_pending_incomes ?? false,
          alert_received_incomes: data.alert_received_incomes ?? false,
        });
      } else {
        setSettings({ ...DEFAULTS, notification_email: user.email || '' });
      }
      setLoading(false);
    })();
  }, [user?.id, user?.email]);

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    const payload = { user_id: user.id, ...settings };
    const { data: existing } = await (supabase
      .from('notification_settings') as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    const op = existing
      ? (supabase.from('notification_settings') as any).update(payload).eq('user_id', user.id)
      : (supabase.from('notification_settings') as any).insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) toast.error('Erro ao salvar: ' + error.message);
    else toast.success('Preferências salvas');
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-due-expenses', { body: { force: true } });
      if (error) throw error;
      const sent = (data as any)?.emailsSent ?? 0;
      toast.success(sent > 0 ? `E-mail enviado!` : 'Nenhum item para alertar agora.');
    } catch (e: any) {
      toast.error('Falha: ' + (e?.message || 'erro desconhecido'));
    } finally {
      setRunning(false);
    }
  };

  if (loading)
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );

  const alertItems: { key: keyof Settings; label: string; desc: string; icon: any; color: string }[] = [
    {
      key: 'alert_overdue_expenses',
      label: 'Despesas vencidas',
      desc: 'Listar despesas com vencimento já passado e ainda não pagas',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      key: 'alert_upcoming_expenses',
      label: 'Despesas a vencer',
      desc: 'Listar despesas próximas do vencimento (dentro da antecedência)',
      icon: Calendar,
      color: 'text-amber-600',
    },
    {
      key: 'alert_pending_incomes',
      label: 'Receitas a receber',
      desc: 'Listar receitas previstas ainda não recebidas',
      icon: Wallet,
      color: 'text-cyan-600',
    },
    {
      key: 'alert_received_incomes',
      label: 'Receitas recebidas',
      desc: 'Confirmar receitas que foram recebidas no período',
      icon: CheckCircle2,
      color: 'text-emerald-600',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Alertas por E-mail
        </CardTitle>
        <CardDescription>
          Escolha quais informações receber e com que frequência. Os alertas são enviados pelo
          servidor SMTP configurado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Ativação */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <Label className="text-base">Receber alertas por e-mail</Label>
            <p className="text-sm text-muted-foreground">Liga/desliga todo o envio de e-mails.</p>
          </div>
          <Switch
            checked={settings.is_enabled && settings.email_enabled}
            onCheckedChange={(c) => {
              update('is_enabled', c);
              update('email_enabled', c);
            }}
          />
        </div>

        {/* E-mail / frequência / antecedência */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>E-mail de destino</Label>
            <Input
              type="email"
              value={settings.notification_email}
              onChange={(e) => update('notification_email', e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Frequência de envio</Label>
            <Select
              value={settings.frequency}
              onValueChange={(v) => update('frequency', v as Settings['frequency'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Horário de envio (Brasília)</Label>
            <Select
              value={String(settings.send_hour)}
              onValueChange={(v) => update('send_hour', Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {Array.from({ length: 24 }, (_, h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, '0')}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O e-mail é disparado automaticamente neste horário.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Antecedência (dias)</Label>
            <Input
              type="number"
              min={0}
              max={60}
              value={settings.days_before_due}
              onChange={(e) => update('days_before_due', Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Janela usada para "a vencer" e "a receber".
            </p>
          </div>
        </div>

        {/* Tipos de alerta */}
        <div className="space-y-2">
          <Label className="text-base">Conteúdo dos e-mails</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {alertItems.map(({ key, label, desc, icon: Icon, color }) => (
              <div
                key={String(key)}
                className="flex items-start justify-between gap-3 p-3 rounded-md border bg-card"
              >
                <div className="flex gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${color}`} />
                  <div>
                    <p className="text-sm font-medium leading-tight">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch
                  checked={settings[key] as boolean}
                  onCheckedChange={(c) => update(key, c as any)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={save} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar preferências
          </Button>
          <Button variant="outline" onClick={runNow} disabled={running} className="flex-1">
            {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
