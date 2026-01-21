import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Mail, Phone, Loader2, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { getUserFriendlyError } from '@/lib/errorMapper';

interface NotificationSettingsData {
  id?: string;
  whatsapp_number: string;
  notification_email: string;
  days_before_due: number;
  is_enabled: boolean;
  email_enabled: boolean;
  send_once_only: boolean;
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettingsData>({
    whatsapp_number: '',
    notification_email: '',
    days_before_due: 3,
    is_enabled: false,
    email_enabled: true,
    send_once_only: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings({
        id: data.id,
        whatsapp_number: data.whatsapp_number || '',
        notification_email: data.notification_email || user.email || '',
        days_before_due: data.days_before_due,
        is_enabled: data.is_enabled,
        email_enabled: data.email_enabled ?? true,
        send_once_only: data.send_once_only ?? false,
      });
    } else {
      // Set default email from user
      setSettings(prev => ({
        ...prev,
        notification_email: user.email || '',
      }));
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validate email if email notifications are enabled
    if (settings.email_enabled && !settings.notification_email) {
      toast.error('Informe um e-mail para receber notificações');
      return;
    }

    // Validate WhatsApp if WhatsApp notifications are enabled
    if (settings.is_enabled) {
      if (!settings.whatsapp_number) {
        toast.error('Informe um número de WhatsApp');
        return;
      }
      
      const phoneNumber = settings.whatsapp_number.trim();
      if (!isValidPhoneNumber(phoneNumber)) {
        toast.error('Número de WhatsApp inválido. Use o formato internacional (ex: +55 11 99999-9999)');
        return;
      }
    }

    setIsSaving(true);

    try {
      // Normalize phone number if provided
      let normalizedPhone = settings.whatsapp_number;
      if (settings.whatsapp_number) {
        const parsedPhone = parsePhoneNumber(settings.whatsapp_number.trim());
        normalizedPhone = parsedPhone ? parsedPhone.format('E.164') : settings.whatsapp_number;
      }

      const dataToSave = {
        whatsapp_number: normalizedPhone || null,
        notification_email: settings.notification_email || null,
        days_before_due: settings.days_before_due,
        is_enabled: settings.is_enabled,
        email_enabled: settings.email_enabled,
        send_once_only: settings.send_once_only,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('notification_settings')
          .update(dataToSave)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            ...dataToSave,
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!settings.notification_email) {
      toast.error('Salve um e-mail primeiro');
      return;
    }

    setIsTesting(true);

    try {
      const { data, error } = await supabase.functions.invoke('check-due-expenses');
      
      if (error) throw error;

      toast.success(
        'Verificação de alertas executada!',
        {
          description: `E-mails enviados: ${data?.totalEmailsSent || 0}`,
          icon: <CheckCircle className="w-5 h-5 text-success" />,
        }
      );
    } catch (error) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsTesting(false);
    }
  };

  const daysOptions = [
    { value: '1', label: '1 dia antes' },
    { value: '2', label: '2 dias antes' },
    { value: '3', label: '3 dias antes' },
    { value: '5', label: '5 dias antes' },
    { value: '7', label: '1 semana antes' },
    { value: '14', label: '2 semanas antes' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notificações de Vencimento
          </CardTitle>
          <CardDescription>
            Configure como e quando deseja ser notificado sobre despesas próximas do vencimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Time Before Due */}
          <div className="space-y-2">
            <Label>Tempo de Antecedência</Label>
            <Select
              value={settings.days_before_due.toString()}
              onValueChange={(value) => setSettings(prev => ({ ...prev, days_before_due: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {daysOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Você será notificado {settings.days_before_due} dia(s) antes da data de vencimento
            </p>
          </div>

          {/* Recurrence */}
          <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
            <Checkbox
              id="send-once"
              checked={settings.send_once_only}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, send_once_only: checked === true }))}
            />
            <div className="flex-1">
              <Label htmlFor="send-once" className="font-medium cursor-pointer">
                Enviar apenas uma vez
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.send_once_only 
                  ? 'Você receberá um único lembrete por despesa'
                  : 'Você receberá lembretes diários até o pagamento'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channels Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Canais de Envio
          </CardTitle>
          <CardDescription>
            Escolha por onde deseja receber as notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Channel */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="email-enabled" className="font-medium cursor-pointer">
                  E-mail
                </Label>
              </div>
              <Switch
                id="email-enabled"
                checked={settings.email_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email_enabled: checked }))}
              />
            </div>
            
            {settings.email_enabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail para Receber Alertas</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={settings.notification_email}
                    onChange={(e) => setSettings(prev => ({ ...prev, notification_email: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp Channel */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="whatsapp-enabled" className="font-medium cursor-pointer">
                  WhatsApp
                </Label>
              </div>
              <Switch
                id="whatsapp-enabled"
                checked={settings.is_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_enabled: checked }))}
              />
            </div>
            
            {settings.is_enabled && (
              <div className="space-y-2">
                <Label htmlFor="whatsapp">Número com DDD</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="+55 (11) 99999-9999"
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Inclua o código do país (+55 para Brasil)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleTestEmail}
          disabled={isTesting || (!settings.email_enabled && !settings.is_enabled)}
          className="flex-1"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Testar Alertas
            </>
          )}
        </Button>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-sm text-foreground">
          <strong>Como funciona:</strong> O sistema verifica diariamente as despesas não pagas 
          próximas do vencimento e envia alertas pelos canais configurados, ajudando você a 
          evitar multas e juros.
        </p>
      </div>
    </div>
  );
}
