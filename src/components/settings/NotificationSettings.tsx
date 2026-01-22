import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/lib/errorMapper';

interface NotificationSettingsData {
  id?: string;
  days_before_due: number;
  send_once_only: boolean;
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettingsData>({
    days_before_due: 3,
    send_once_only: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        days_before_due: data.days_before_due,
        send_once_only: data.send_once_only ?? false,
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);

    try {
      const dataToSave = {
        days_before_due: settings.days_before_due,
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
            Configure quando deseja ser notificado sobre despesas próximas do vencimento
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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-primary text-primary-foreground shadow hover:bg-primary/90 flex-1"
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
      </div>
    </div>
  );
}
