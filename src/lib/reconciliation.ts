import type { StatementTxn } from "./statement-parsers";
import type { Expense } from "@/types/finance";
import type { Income } from "@/types/income";

export type MatchStatus = "matched" | "divergent" | "missing";

export interface ReconciledItem {
  txn: StatementTxn;
  status: MatchStatus;
  /** matched/divergent: existing transaction id and its kind */
  matchId?: string;
  matchKind?: "expense" | "income";
  divergenceReason?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function similarity(a: string, b: string): number {
  const A = a.toLowerCase().replace(/\s+/g, " ").trim();
  const B = b.toLowerCase().replace(/\s+/g, " ").trim();
  if (!A || !B) return 0;
  if (A === B) return 1;
  const aw = new Set(A.split(" "));
  const bw = new Set(B.split(" "));
  let inter = 0;
  aw.forEach((w) => bw.has(w) && inter++);
  return inter / Math.max(aw.size, bw.size);
}

export function reconcile(
  txns: StatementTxn[],
  expenses: Expense[],
  incomes: Income[],
  accountId?: string,
): ReconciledItem[] {
  // restrict to chosen account when present
  const exp = accountId
    ? expenses.filter((e) => !e.accountId || e.accountId === accountId)
    : expenses;
  const inc = accountId
    ? incomes.filter((i) => !i.accountId || i.accountId === accountId)
    : incomes;

  const usedExp = new Set<string>();
  const usedInc = new Set<string>();

  return txns.map<ReconciledItem>((txn) => {
    const isCredit = txn.amount > 0;
    const absAmt = Math.abs(txn.amount);
    const txnTime = txn.date.getTime();

    const candidates = isCredit
      ? inc
          .filter((i) => !usedInc.has(i.id))
          .map((i) => ({
            id: i.id,
            kind: "income" as const,
            amount: i.amount,
            date: i.receiveDate,
            description: i.title + " " + (i.description || ""),
          }))
      : exp
          .filter((e) => !usedExp.has(e.id))
          .map((e) => ({
            id: e.id,
            kind: "expense" as const,
            amount: e.amount,
            date: e.dueDate,
            description: e.description,
          }));

    // exact match: same |amount| and date within ±3 days
    const exact = candidates.find(
      (c) =>
        Math.abs(c.amount - absAmt) < 0.01 &&
        Math.abs(c.date.getTime() - txnTime) <= 3 * DAY_MS,
    );
    if (exact) {
      if (exact.kind === "income") usedInc.add(exact.id);
      else usedExp.add(exact.id);
      return { txn, status: "matched", matchId: exact.id, matchKind: exact.kind };
    }

    // divergent: similar description within ±5 days, but value differs
    const fuzzy = candidates
      .filter(
        (c) =>
          Math.abs(c.date.getTime() - txnTime) <= 5 * DAY_MS &&
          similarity(c.description, txn.description) > 0.5,
      )
      .sort(
        (a, b) =>
          similarity(b.description, txn.description) -
          similarity(a.description, txn.description),
      )[0];

    if (fuzzy) {
      if (fuzzy.kind === "income") usedInc.add(fuzzy.id);
      else usedExp.add(fuzzy.id);
      const reason =
        Math.abs(fuzzy.amount - absAmt) >= 0.01
          ? `Valor divergente: sistema R$ ${fuzzy.amount.toFixed(2)} × extrato R$ ${absAmt.toFixed(2)}`
          : "Datas próximas mas com diferença";
      return {
        txn,
        status: "divergent",
        matchId: fuzzy.id,
        matchKind: fuzzy.kind,
        divergenceReason: reason,
      };
    }

    return { txn, status: "missing" };
  });
}
