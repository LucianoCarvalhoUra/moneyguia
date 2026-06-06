import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, Loader2, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailSmtpSettings() {
  const { user } = useAuth();
  const [testTo, setTestTo] = useState(user?.email || '');
  const [sending, setSending] = useState(false);

  const sendTest = async () => {
    if (!testTo) {
      toast.error('Informe um e-mail de destino');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email-smtp', {
        body: {
          to: testTo,
          subject: 'Teste de envio SMTP - MoneyGuia',
          html: `<div style="font-family:Arial,sans-serif;padding:20px;">
            <h2 style="color:#2563eb;">SMTP funcionando ✅</h2>
            <p>Este é um e-mail de teste enviado via servidor SMTP do Hostinger.</p>
            <p style="color:#64748b;font-size:12px;">Enviado em ${new Date().toLocaleString('pt-BR')}</p>
          </div>`,
          text: 'SMTP funcionando. Este e um e-mail de teste do MoneyGuia.',
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`E-mail enviado para ${testTo}`);
    } catch (e: any) {
      toast.error(`Falha no envio: ${e?.message || 'erro desconhecido'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          E-mail (SMTP)
        </CardTitle>
        <CardDescription>
          Configuração do servidor de envio de e-mails (Hostinger SMTP).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Servidor</Label>
            <div className="px-3 py-2 rounded-md bg-muted text-sm">smtp.hostinger.com</div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Porta / Segurança</Label>
            <div className="px-3 py-2 rounded-md bg-muted text-sm">465 · SSL/TLS</div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            As credenciais (usuário, senha, remetente) ficam armazenadas com segurança no cofre do
            backend e nunca trafegam pelo navegador. Para alterá-las, peça suporte ou use o painel de
            secrets.
          </span>
        </div>

        <div className="border-t pt-4 space-y-2">
          <Label htmlFor="test-to">Enviar e-mail de teste para</Label>
          <div className="flex gap-2">
            <Input
              id="test-to"
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="seu@email.com"
            />
            <Button onClick={sendTest} disabled={sending}>
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
