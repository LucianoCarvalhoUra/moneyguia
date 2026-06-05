import { parseBRDate, parseBRAmount, type StatementTxn } from "./index";

/**
 * C6 Bank CSV típico:
 *   "Data de Lançamento","Título","Descrição","Valor (R$)"
 *   "01/03/2025","Compra","MERCADO XYZ","-49,90"
 */
export function parseC6CSV(text: string): StatementTxn[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const txns: StatementTxn[] = [];

  const splitCSV = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if ((ch === "," || ch === ";") && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  lines.forEach((line, idx) => {
    const parts = splitCSV(line).map((p) => p.trim());
    if (parts.length < 3) return;
    const date = parseBRDate(parts[0]);
    if (!date) return;
    // descrição = junção das colunas do meio
    const desc = parts.slice(1, parts.length - 1).join(" - ").trim();
    const amount = parseBRAmount(parts[parts.length - 1]);
    if (!amount && !desc) return;
    txns.push({
      uid: `c6-${idx}-${date.getTime()}-${amount}`,
      date,
      description: desc,
      amount,
    });
  });

  return txns;
}
