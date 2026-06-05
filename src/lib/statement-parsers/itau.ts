import { parseBRDate, parseBRAmount, type StatementTxn } from "./index";

/**
 * Itaú CSV típico:
 *   data;descricao;valor
 *   01/03/2025;PIX TRANSF FULANO;-150,00
 */
export function parseItauCSV(text: string): StatementTxn[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const txns: StatementTxn[] = [];

  lines.forEach((line, idx) => {
    const sep = line.includes(";") ? ";" : ",";
    const parts = line.split(sep);
    if (parts.length < 3) return;
    const date = parseBRDate(parts[0]);
    if (!date) return; // skip header / non-date rows
    const desc = parts.slice(1, parts.length - 1).join(" ").trim();
    const amount = parseBRAmount(parts[parts.length - 1]);
    if (!amount && !desc) return;
    txns.push({
      uid: `itau-${idx}-${date.getTime()}-${amount}`,
      date,
      description: desc,
      amount,
    });
  });

  return txns;
}
