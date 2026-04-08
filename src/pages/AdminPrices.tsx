import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Save, FlaskConical, Shield } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  plan_type: string;
  price_monthly: number;
  price_yearly: number;
  external_price_id_monthly?: string | null;
  external_price_id_yearly?: string | null;
}

export default function AdminPrices() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("price_monthly", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar planos");
    } else {
      setPlans((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleInputChange = (id: string, field: keyof Plan, value: string | number) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSave = async (plan: Plan) => {
    setSavingId(plan.id);
    const { error } = await supabase
      .from("subscription_plans")
      .update({
        price_monthly: Number(plan.price_monthly),
        price_yearly: Number(plan.price_yearly),
        external_price_id_monthly: plan.external_price_id_monthly,
        external_price_id_yearly: plan.external_price_id_yearly,
      })
      .eq("id", plan.id);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success(`Plano ${plan.name} atualizado!`);
    }
    setSavingId(null);
  };

  const handleTestMode = async (plan: Plan) => {
    if (!confirm(`Deseja ativar o modo teste (R$ 1,00) para o plano ${plan.name}?`)) return;
    
    const updatedPlan = { ...plan, price_monthly: 1, price_yearly: 1 };
    await handleSave(updatedPlan);
    setPlans(prev => prev.map(p => p.id === plan.id ? updatedPlan : p));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Gestão de Preços</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planos de Assinatura</CardTitle>
          <CardDescription>Configure os valores cobrados e os IDs de integração com gateways de pagamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Mensal (R$)</TableHead>
                <TableHead>Anual (R$)</TableHead>
                <TableHead>ID Externo (Mensal)</TableHead>
                <TableHead>ID Externo (Anual)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-bold">{plan.name}</TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      className="w-24" 
                      value={plan.price_monthly} 
                      onChange={e => handleInputChange(plan.id, "price_monthly", e.target.value)} 
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      className="w-24" 
                      value={plan.price_yearly} 
                      onChange={e => handleInputChange(plan.id, "price_yearly", e.target.value)} 
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder="ID Stripe/MP" 
                      value={plan.external_price_id_monthly || ""} 
                      onChange={e => handleInputChange(plan.id, "external_price_id_monthly", e.target.value)} 
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      placeholder="ID Stripe/MP" 
                      value={plan.external_price_id_yearly || ""} 
                      onChange={e => handleInputChange(plan.id, "external_price_id_yearly", e.target.value)} 
                    />
                  </TableCell>
                  <TableCell className="text-right flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleTestMode(plan)}>
                      <FlaskConical className="w-4 h-4 mr-1" /> Modo Teste
                    </Button>
                    <Button size="sm" disabled={savingId === plan.id} onClick={() => handleSave(plan)}>
                      {savingId === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Salvar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}