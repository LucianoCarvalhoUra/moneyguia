import { parseOFX } from "./ofx";
import { parseItauCSV } from "./itau";
import { parseSantanderCSV } from "./santander";
import { parseC6CSV } from "./c6";

export type BankId = "itau" | "santander" | "c6" | "auto";

export interface StatementTxn {
  /** id unique within file */
  uid: string;
  date: Date;
  description: string;
  /** positive = credit (income), negative = debit (expense) */
  amount: number;
}

export const BANK_OPTIONS: { id: BankId; label: string }[] = [
  { id: "itau", label: "Itaú" },
  { id: "santander", label: "Santander" },
  { id: "c6", label: "C6 Bank" },
];

export function parseStatement(text: string, bank: BankId): StatementTxn[] {
  const trimmed = text.trim();
  // OFX detection
  if (/OFXHEADER|<OFX>/i.test(trimmed.slice(0, 200))) {
    return parseOFX(trimmed);
  }
  switch (bank) {
    case "itau":
      return parseItauCSV(trimmed);
    case "santander":
      return parseSantanderCSV(trimmed);
    case "c6":
      return parseC6CSV(trimmed);
    default:
      // Fallback: try all
      return (
        parseItauCSV(trimmed) ||
        parseSantanderCSV(trimmed) ||
        parseC6CSV(trimmed) ||
        []
      );
  }
}

export function parseBRDate(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return null;
  const [_, d, mo, y] = m;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  return new Date(year, Number(mo) - 1, Number(d), 12, 0, 0);
}

export function parseBRAmount(s: string): number {
  const cleaned = s
    .replace(/\s/g, "")
    .replace(/R\$/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}
