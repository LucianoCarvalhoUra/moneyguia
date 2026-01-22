import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Building2, CreditCard, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { CreditCard as CreditCardType } from '@/types/finance';

export default function Accounts() {
  const { accounts, cards, addAccount, removeAccount, addCard, updateCard, removeCard } = useFinance();
  
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [deleteAccountDialog, setDeleteAccountDialog] = useState<string | null>(null);
  const [deleteCardDialog, setDeleteCardDialog] = useState<string | null>(null);

  // Account form
  const [bankName, setBankName] = useState('');
  const [agency, setAgency] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Card form
  const [brand, setBrand] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !agency || !accountNumber) {
      toast.error('Preencha todos os campos');
      return;
    }
    addAccount({ bankName, agency, accountNumber });
    toast.success('Conta adicionada com sucesso!');
    setAccountDialogOpen(false);
    setBankName('');
    setAgency('');
    setAccountNumber('');
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !lastFourDigits || lastFourDigits.length !== 4) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }
    
    if (editingCard) {
      await updateCard(editingCard.id, { brand, lastFourDigits });
      toast.success('Cartão atualizado com sucesso!');
    } else {
      await addCard({ brand, lastFourDigits });
      toast.success('Cartão adicionado com sucesso!');
    }
    
    closeCardDialog();
  };

  const openEditCard = (card: CreditCardType) => {
    setEditingCard(card);
    setBrand(card.brand);
    setLastFourDigits(card.lastFourDigits);
    setCardDialogOpen(true);
  };

  const closeCardDialog = () => {
    setCardDialogOpen(false);
    setEditingCard(null);
    setBrand('');
    setLastFourDigits('');
  };

  const confirmDeleteAccount = () => {
    if (deleteAccountDialog) {
      removeAccount(deleteAccountDialog);
      toast.success('Conta removida com sucesso!');
      setDeleteAccountDialog(null);
    }
  };

  const confirmDeleteCard = () => {
    if (deleteCardDialog) {
      removeCard(deleteCardDialog);
      toast.success('Cartão removido com sucesso!');
      setDeleteCardDialog(null);
    }
  };

  const cardBrands = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contas e Cartões</h1>
        <p className="text-muted-foreground">Gerencie suas contas correntes e cartões de crédito</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bank Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Contas Correntes
              </CardTitle>
              <CardDescription>Suas contas bancárias cadastradas</CardDescription>
            </div>
            <Button className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground" size="sm" onClick={() => setAccountDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma conta cadastrada</p>
                <p className="text-sm">Adicione sua primeira conta corrente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{account.bankName}</p>
                        <p className="text-sm text-muted-foreground">
                          Ag: {account.agency} • CC: {account.accountNumber}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setDeleteAccountDialog(account.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-accent" />
                Cartões de Crédito
              </CardTitle>
              <CardDescription>Seus cartões cadastrados</CardDescription>
            </div>
            <Button className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground" size="sm" onClick={() => setCardDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {cards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum cartão cadastrado</p>
                <p className="text-sm">Adicione seu primeiro cartão de crédito</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 group cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => openEditCard(card)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{card.brand}</p>
                        <p className="text-sm text-muted-foreground">
                          •••• •••• •••• {card.lastFourDigits}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditCard(card);
                        }}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:text-accent-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteCardDialog(card.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Account Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conta Corrente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Nome do Banco</Label>
              <Input
                id="bankName"
                placeholder="Ex: Banco do Brasil"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agency">Agência</Label>
                <Input
                  id="agency"
                  placeholder="0001"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Número da Conta</Label>
                <Input
                  id="accountNumber"
                  placeholder="12345-6"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground flex-1" onClick={() => setAccountDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground shadow hover:bg-primary/90 flex-1">
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Card Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={(open) => !open && closeCardDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCard} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Bandeira</Label>
              <Input
                id="brand"
                placeholder="Ex: Visa"
                list="brands"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                required
              />
              <datalist id="brands">
                {cardBrands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastFour">Últimos 4 dígitos</Label>
              <Input
                id="lastFour"
                placeholder="1234"
                maxLength={4}
                value={lastFourDigits}
                onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground flex-1" onClick={closeCardDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground shadow hover:bg-primary/90 flex-1">
                {editingCard ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialogs */}
      <AlertDialog open={!!deleteAccountDialog} onOpenChange={() => setDeleteAccountDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta conta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAccount} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCardDialog} onOpenChange={() => setDeleteCardDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este cartão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCard} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
