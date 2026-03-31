import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { useFinance } from "@/contexts/FinanceContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const getDayDiff = (date: Date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export default function UpcomingDueExpenses() {
  const { expenses } = useFinance();

  const upcoming = expenses
    .filter((expense) => {
      if (expense.isPaid) return false;
      const dueDate = new Date(expense.dueDate);
      if (Number.isNaN(dueDate.getTime())) return false;

      const dayDiff = getDayDiff(dueDate);
      return dayDiff >= 0;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  if (!upcoming.length) return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);

  return (
    <Card className="rounded-3xl border border-white/40 bg-white/70 shadow-2xl backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-5 w-5 text-primary" />
          Próximos Vencimentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.map((expense) => {
          const dueDate = new Date(expense.dueDate);
          const dayDiff = getDayDiff(dueDate);

          return (
            <div
              key={expense.id}
              className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/65 px-3 py-2 backdrop-blur-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{expense.description}</p>
                <p className="text-xs text-muted-foreground">
                  Vence em {format(dueDate, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-2 pl-2">
                {(dayDiff === 0 || dayDiff <= 3) && (
                  <Badge className={dayDiff === 0 ? "bg-red-500 text-white" : "bg-amber-500 text-white"}>
                    {dayDiff === 0 ? "Vence hoje" : `Em ${dayDiff} dia${dayDiff > 1 ? "s" : ""}`}
                  </Badge>
                )}
                <span className="text-sm font-semibold">{formatCurrency(expense.amount)}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}