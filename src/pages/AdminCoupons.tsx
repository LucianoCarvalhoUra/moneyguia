import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Ticket, Trash2, Shield, Info, AlertTriangle } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminCoupons() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const confirmDelete = async () => {
    if (!couponToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", couponToDelete.id);
      if (error) throw error;
      
      setCoupons(prev => prev.filter(c => c.id !== couponToDelete.id));
      toast.success("Cupom removido");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setIsDeleting(false);
      setCouponToDelete(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground">Gestão de estratégias promocionais</p>
          </div>
        </div>

        <Tabs value={location.pathname} className="w-full" onValueChange={(v) => navigate(v)}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="/admin" className="gap-2">
              <Shield className="w-4 h-4" /> Gestão de Licenças
            </TabsTrigger>
            <TabsTrigger value="/admin/coupons" className="gap-2">
              <Ticket className="w-4 h-4" /> Gestão de Cupons
            </TabsTrigger>
            <TabsTrigger value="/admin/csat" className="gap-2">
              <Info className="w-4 h-4" /> Pesquisas CSAT
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="rounded-3xl border border-white/40 bg-white/70 shadow-2xl backdrop-blur-lg overflow-hidden">
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

      <Card className="rounded-3xl border border-white/40 bg-white/70 shadow-2xl backdrop-blur-lg overflow-hidden">
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
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setCouponToDelete(c)}>
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

      <AlertDialog open={Boolean(couponToDelete)} onOpenChange={(open) => !open && setCouponToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border border-white/40 bg-white/80 shadow-2xl backdrop-blur-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground font-bold">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Excluir Cupom?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O código <span className="font-mono font-bold text-foreground">[{couponToDelete?.code}]</span> deixará de funcionar imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="hover:bg-transparent">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}