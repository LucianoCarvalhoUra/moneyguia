import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
import { User, Shield, Loader2, Bell } from 'lucide-react';
import UnifiedCategoryManager from '../components/settings/UnifiedCategoryManager';
import DeleteProfileDialog from '@/components/settings/DeleteProfileDialog';
import ChangePasswordForm from '@/components/settings/ChangePasswordForm';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Profile {
  name: string;
  email: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alertDays, setAlertDays] = useState('2');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertType, setAlertType] = useState('expenses');

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
              className={cn(alertEnabled ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground hover:bg-muted/80")}
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
          
          <div className="border-t pt-4">
            <h4 className="font-medium text-destructive mb-2">Zona de Perigo</h4>
            <DeleteProfileDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
