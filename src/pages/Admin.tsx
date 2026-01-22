import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Loader2, Send, Mail } from 'lucide-react';
import { toast } from 'sonner';
import emailjs from '@emailjs/browser';

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isCheckingAdmin } = useAdminCheck();
  const [isTesting, setIsTesting] = useState(false);
  const [alertEmail, setAlertEmail] = useState('');

  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      toast.error('Acesso não autorizado');
      navigate('/');
    }
  }, [isCheckingAdmin, isAdmin, navigate]);

  useEffect(() => {
    const loadUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setAlertEmail(user.email);
      }
    };
    loadUserEmail();
  }, []);

  const handleTestEmail = async () => {
    if (!alertEmail) {
      toast.error('Por favor, informe um e-mail para receber o alerta.');
      return;
    }

    setIsTesting(true);
    console.log('Enviando e-mail via EmailJS...');
    try {
      // Configuração do EmailJS
      const serviceId = 'service_zt7h2zc';
      const templateId = 'template_rg9q1ib';
      const publicKey = 'IwkbWoFVQ5W0HUFPo';

      emailjs.init(publicKey);

      const templateParams = {
        to_email: alertEmail,
        message: 'Este é um teste de envio de alerta via EmailJS.',
        from_name: 'KeepMoney Admin'
      };

      await emailjs.send(serviceId, templateId, templateParams, publicKey);

      toast.success(`E-mail de teste enviado para ${alertEmail}!`);
    } catch (error: any) {
      console.error('Error sending email:', error);
      const errorMessage = error?.text || error?.message || 'Erro desconhecido';
      toast.error(`Erro ao enviar: ${errorMessage}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Painel do Administrador
        </h1>
        <p className="text-muted-foreground">Configurações globais do sistema</p>
      </div>

      {/* Canais de Envio Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Canais de Envio
          </CardTitle>
          <CardDescription>
            Configure os canais para recebimento de alertas do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alert-email">E-mail para Receber Alertas</Label>
            <div className="flex gap-2">
              <Input
                id="alert-email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <Button onClick={handleTestEmail} disabled={isTesting} className="bg-primary text-primary-foreground shadow hover:bg-primary/90 whitespace-nowrap">
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
            <p className="text-xs text-muted-foreground">
              Este endereço será usado para notificações administrativas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Como funciona:</strong> O sistema utiliza o EmailJS para envio de notificações.
              Certifique-se de que o serviço está configurado corretamente no código.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
