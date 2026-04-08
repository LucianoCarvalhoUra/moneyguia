import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Ticket, Trash2 } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminCoupons() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState("");

  console.log('Dados do usuário logado na Admin de Cupons:', user);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newDiscount) return;

    const { error } = await supabase.from("coupons").insert({
      code: newCode.toUpperCase(),
      discount_percentage: Number(newDiscount),
      is_active: true
    });

    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Cupom criado!");
      setNewCode(""); setNewDiscount("");
      fetchCoupons();
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ is_active: active }).eq("id", id);
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: active } : c));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir cupom permanentemente?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    setCoupons(prev => prev.filter(c => c.id !== id));
    toast.success("Cupom removido");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-2">
        <Ticket className="w-6 h-6 text-emerald-600" />
        <h1 className="text-2xl font-bold">Gestão de Cupons</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Novo Cupom</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-4">
            <div className="flex-1">
              <Input placeholder="CÓDIGO" value={newCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCode(e.target.value)} />
            </div>
            <div className="w-32">
              <Input type="number" placeholder="%" value={newDiscount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDiscount(e.target.value)} />
            </div>
            <Button type="submit"><Plus className="w-4 h-4 mr-1" /> Criar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold">{c.code}</TableCell>
                  <TableCell>{c.discount_percentage}%</TableCell>
                  <TableCell>
                    <Switch checked={c.is_active} onCheckedChange={(val) => handleToggle(c.id, val)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {coupons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    Nenhum cupom cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}