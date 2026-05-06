import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  ArrowLeft,
  FileText,
} from "lucide-react";
import {
  parseStatement,
  BANK_OPTIONS,
  type BankId,
  type StatementTxn,
} from "@/lib/statement-parsers";
import { reconcile, type ReconciledItem } from "@/lib/reconciliation";
import { useFinance } from "@/contexts/FinanceContext";
import { useIncome } from "@/contexts/IncomeContext";

type Step = "upload" | "preview" | "match";

interface PreviewRow extends StatementTxn {
  selected: boolean;
}

interface MissingDecision {
  selected: boolean;
  categoryId: string;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function Reconciliation() {
  const { accounts, categories, expenses, addExpense } = useFinance();
  const { incomeCategories, incomes, addIncome } = useIncome();

  const [step, setStep] = useState<Step>("upload");
  const [bank, setBank] = useState<BankId>("itau");
  const [accountId, setAccountId] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [results, setResults] = useState<ReconciledItem[]>([]);
  const [decisions, setDecisions] = useState<Record<string, MissingDecision>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const txns = parseStatement(text, bank);
      if (!txns.length) {
        toast.error("Não foi possível extrair lançamentos. Verifique o banco e o formato.");
        return;
      }
      setFileName(file.name);
      setRows(txns.map((t) => ({ ...t, selected: true })));
      setStep("preview");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao ler arquivo");
    }
  };

  const startMatching = () => {
    const selectedTxns = rows.filter((r) => r.selected);
    if (!selectedTxns.length) {
      toast.error("Selecione ao menos um lançamento");
      return;
    }
    const res = reconcile(selectedTxns, expenses, incomes, accountId || undefined);
    setResults(res);
    const initialDec: Record<string, MissingDecision> = {};
    res.forEach((r) => {
      if (r.status === "missing") {
        initialDec[r.txn.uid] = { selected: true, categoryId: "" };
      }
    });
    setDecisions(initialDec);
    setStep("match");
  };

  const counts = useMemo(() => {
    return {
      matched: results.filter((r) => r.status === "matched").length,
      divergent: results.filter((r) => r.status === "divergent").length,
      missing: results.filter((r) => r.status === "missing").length,
    };
  }, [results]);

  const confirmInclusions = async () => {
    const toAdd = results.filter(
      (r) => r.status === "missing" && decisions[r.txn.uid]?.selected,
    );
    if (!toAdd.length) {
      toast.info("Nenhum item marcado para inclusão");
      return;
    }
    const missingCat = toAdd.find((r) => !decisions[r.txn.uid].categoryId);
    if (missingCat) {
      toast.error("Selecione uma categoria para todos os itens marcados");
      return;
    }

    setSubmitting(true);
    try {
      let added = 0;
      for (const r of toAdd) {
        const dec = decisions[r.txn.uid];
        if (r.txn.amount > 0) {
          await addIncome({
            categoryId: dec.categoryId,
            title: r.txn.description || "Lançamento do extrato",
            amount: Math.abs(r.txn.amount),
            receiveDate: r.txn.date,
            description: `Importado do extrato (${fileName})`,
            isRecurring: false,
            isReceived: true,
            accountId: accountId || undefined,
          });
        } else {
          await addExpense({
            categoryId: dec.categoryId,
            description: r.txn.description || "Lançamento do extrato",
            amount: Math.abs(r.txn.amount),
            expenseDate: r.txn.date,
            dueDate: r.txn.date,
            paymentMethod: "account",
            accountId: accountId || undefined,
            isRecurring: false,
            isPaid: true,
            observation: `Importado do extrato (${fileName})`,
          });
        }
        added++;
      }
      toast.success(`${added} lançamento(s) incluído(s)`);
      // reset
      setStep("upload");
      setRows([]);
      setResults([]);
      setDecisions({});
      setFileName("");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao incluir lançamentos");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conciliação Bancária</h1>
          <p className="text-muted-foreground">
            Importe seu extrato e compare com os lançamentos do sistema
          </p>
        </div>
        {step !== "upload" && (
          <Button variant="outline" onClick={() => setStep("upload")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Recomeçar
          </Button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs">
        {(["upload", "preview", "match"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <Badge variant={step === s ? "default" : "outline"}>
              {i + 1}. {s === "upload" ? "Importar" : s === "preview" ? "Prévia" : "Conferência"}
            </Badge>
            {i < 2 && <span className="text-muted-foreground">→</span>}
          </div>
        ))}
      </div>

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Importar extrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Banco</Label>
                <Select value={bank} onValueChange={(v) => setBank(v as BankId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_OPTIONS.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conta destino (opcional)</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.bankName} - {a.agency}/{a.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Envie o arquivo do extrato (.ofx, .csv ou .txt)
              </p>
              <Input
                id="file-input"
                type="file"
                accept=".ofx,.csv,.txt"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="max-w-sm mx-auto"
              />
              <p className="text-xs text-muted-foreground mt-3">
                Bancos suportados: Itaú, Santander e C6 Bank. OFX é detectado automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" /> Prévia: {fileName}
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{rows.length} lançamentos</Badge>
              <Badge>{rows.filter((r) => r.selected).length} selecionados</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={rows.every((r) => r.selected)}
                      onCheckedChange={(v) =>
                        setRows((rs) => rs.map((r) => ({ ...r, selected: !!v })))
                      }
                    />
                  </TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.uid}>
                    <TableCell>
                      <Checkbox
                        checked={r.selected}
                        onCheckedChange={(v) =>
                          setRows((rs) => {
                            const c = [...rs];
                            c[i] = { ...c[i], selected: !!v };
                            return c;
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>{r.date.toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="max-w-md truncate">{r.description}</TableCell>
                    <TableCell>
                      {r.amount >= 0 ? (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          Crédito
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                          Débito
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${r.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmtBRL(r.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 flex justify-end">
              <Button onClick={startMatching}>Iniciar conferência →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "match" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Conferidos</p>
                  <p className="text-xl font-bold">{counts.matched}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Divergentes</p>
                  <p className="text-xl font-bold">{counts.divergent}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 flex items-center gap-3">
                <PlusCircle className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Faltantes</p>
                  <p className="text-xl font-bold">{counts.missing}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {counts.matched > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-green-700">Conferidos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results
                      .filter((r) => r.status === "matched")
                      .map((r) => (
                        <TableRow key={r.txn.uid}>
                          <TableCell>{r.txn.date.toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{r.txn.description}</TableCell>
                          <TableCell className="text-right">{fmtBRL(r.txn.amount)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {counts.divergent > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-amber-700">Divergentes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Divergência</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results
                      .filter((r) => r.status === "divergent")
                      .map((r) => (
                        <TableRow key={r.txn.uid}>
                          <TableCell>{r.txn.date.toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{r.txn.description}</TableCell>
                          <TableCell className="text-xs text-amber-700">
                            {r.divergenceReason}
                          </TableCell>
                          <TableCell className="text-right">{fmtBRL(r.txn.amount)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {counts.missing > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-blue-700">
                  Faltantes no sistema — marque os que deseja incluir
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Incluir</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results
                      .filter((r) => r.status === "missing")
                      .map((r) => {
                        const dec = decisions[r.txn.uid] || {
                          selected: true,
                          categoryId: "",
                        };
                        const isIncome = r.txn.amount > 0;
                        const cats = isIncome ? incomeCategories : categories;
                        return (
                          <TableRow key={r.txn.uid}>
                            <TableCell>
                              <Checkbox
                                checked={dec.selected}
                                onCheckedChange={(v) =>
                                  setDecisions((d) => ({
                                    ...d,
                                    [r.txn.uid]: { ...dec, selected: !!v },
                                  }))
                                }
                              />
                            </TableCell>
                            <TableCell>{r.txn.date.toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {r.txn.description}
                            </TableCell>
                            <TableCell>
                              {isIncome ? (
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                  Receita
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                  Despesa
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={dec.categoryId}
                                onValueChange={(v) =>
                                  setDecisions((d) => ({
                                    ...d,
                                    [r.txn.uid]: { ...dec, categoryId: v },
                                  }))
                                }
                                disabled={!dec.selected}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {cats.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell
                              className={`text-right font-semibold ${
                                isIncome ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {fmtBRL(r.txn.amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
                <div className="p-4 flex justify-end">
                  <Button onClick={confirmInclusions} disabled={submitting}>
                    {submitting ? "Incluindo..." : "Confirmar inclusões"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
