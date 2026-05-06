import { parseBRDate, parseBRAmount, type StatementTxn } from "./index";

/**
 * Santander CSV típico (txt exportado):
 *   Data;Histórico;Documento;Valor;Saldo
 *   01/03/2025;PIX RECEBIDO;000123;1.500,00;5.000,00
 */
export function parseSantanderCSV(text: string): StatementTxn[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const txns: StatementTxn[] = [];

  lines.forEach((line, idx) => {
    const sep = line.includes(";") ? ";" : ",";
    const parts = line.split(sep);
    if (parts.length < 4) return;
    const date = parseBRDate(parts[0]);
    if (!date) return;
    const desc = parts[1]?.trim() || "";
    // valor é o penúltimo (último é saldo) ou o último se 4 colunas
    const valueStr =
      parts.length >= 5 ? parts[parts.length - 2] : parts[parts.length - 1];
    const amount = parseBRAmount(valueStr);
    if (!amount && !desc) return;
    txns.push({
      uid: `santander-${idx}-${date.getTime()}-${amount}`,
      date,
      description: desc,
      amount,
    });
  });

  return txns;
}
