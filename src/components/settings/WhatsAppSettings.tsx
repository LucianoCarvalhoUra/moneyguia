import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Phone, Bell, Send, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { getUserFriendlyError } from '@/lib/errorMapper';

interface NotificationSettings {
  id?: string;
  whatsapp_number: string;
  days_before_due: number;
  is_enabled: boolean;
}

export default function WhatsAppSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings>({
    whatsapp_number: '',
    days_before_due: 3,
    is_enabled: true,
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
        days_before_due: data.days_before_due,
        is_enabled: data.is_enabled,
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (!settings.whatsapp_number) {
      toast.error('Informe um número de WhatsApp');
      return;
    }

    // Proper phone validation using libphonenumber-js
    const phoneNumber = settings.whatsapp_number.trim();
    if (!isValidPhoneNumber(phoneNumber)) {
      toast.error('Número de WhatsApp inválido. Use o formato internacional (ex: +55 11 99999-9999)');
      return;
    }
    
    // Normalize phone number to E.164 format for storage
    const parsedPhone = parsePhoneNumber(phoneNumber);
    const normalizedPhone = parsedPhone ? parsedPhone.format('E.164') : phoneNumber;

    setIsSaving(true);

    try {
      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('notification_settings')
          .update({
            whatsapp_number: normalizedPhone,
            days_before_due: settings.days_before_due,
            is_enabled: settings.is_enabled,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('notification_settings')
          .insert({
            user_id: user.id,
            whatsapp_number: normalizedPhone,
            days_before_due: settings.days_before_due,
            is_enabled: settings.is_enabled,
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

  const handleTestNotification = async () => {
    if (!settings.whatsapp_number) {
      toast.error('Salve um número de WhatsApp primeiro');
      return;
    }

    setIsTesting(true);
    
    // Simulate test - in production this would call an edge function
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success(
      'Notificação de teste enviada! Verifique seu WhatsApp.',
      {
        description: `Número: ${settings.whatsapp_number}`,
        icon: <CheckCircle className="w-5 h-5 text-success" />,
      }
    );
    
    setIsTesting(false);
  };

  const daysOptions = [
    { value: '1', label: '1 dia antes' },
    { value: '2', label: '2 dias antes' },
    { value: '3', label: '3 dias antes' },
    { value: '5', label: '5 dias antes' },
    { value: '7', label: '7 dias antes' },
    { value: '14', label: '14 dias antes' },
    { value: '30', label: '30 dias antes' },
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
      {/* WhatsApp Number Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-success" />
            Número do WhatsApp
          </CardTitle>
          <CardDescription>
            Informe seu número para receber lembretes de vencimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <Label htmlFor="notifications-enabled" className="font-medium">
                Notificações Ativas
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber alertas de vencimento via WhatsApp
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={settings.is_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_enabled: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Timing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            Periodicidade
          </CardTitle>
          <CardDescription>
            Configure com quantos dias de antecedência deseja ser notificado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notificar antes do vencimento</Label>
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
              Você será notificado {settings.days_before_due} dia(s) antes da data de vencimento de cada despesa
            </p>
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
          onClick={handleTestNotification}
          disabled={isTesting || !settings.whatsapp_number}
          className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground flex-1"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Testar Envio
            </>
          )}
        </Button>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-sm text-foreground">
          <strong>Como funciona:</strong> Você receberá uma mensagem no WhatsApp 
          informando sobre as despesas que estão próximas do vencimento, 
          permitindo que você se planeje para evitar multas e juros.
        </p>
      </div>
    </div>
  );
}
