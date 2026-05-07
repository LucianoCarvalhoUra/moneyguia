import { parseBRDate, parseBRAmount, type StatementTxn } from "./index";

/**
 * Parser genérico para textos não estruturados (PDF convertido em texto,
 * extratos copiados manualmente, formatos desconhecidos de banco etc.).
 *
 * Estratégia:
 *  - quebra o texto em linhas
 *  - em cada linha procura uma data BR (dd/mm/aaaa ou dd/mm/aa)
 *  - procura o último valor monetário da linha (com R$, vírgula decimal,
 *    sufixo D/C ou sinal de menos)
 *  - tudo entre a data e o valor é considerado a descrição
 */
export function parseGenericText(text: string): StatementTxn[] {
  const txns: StatementTxn[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const dateRe = /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/;
  // Captura valores tipo: 1.234,56 | -1.234,56 | R$ 1.234,56 | 1234.56 | 1234,56 D
  const amountRe =
    /(-?\s?R?\$?\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\s?\d+,\d{2}|-?\s?\d+\.\d{2})\s?([DC]|CR|DB)?\b/gi;

  lines.forEach((line, idx) => {
    const dateMatch = line.match(dateRe);
    if (!dateMatch) return;
    const date = parseBRDate(dateMatch[1]);
    if (!date) return;

    // Pega o último valor encontrado na linha
    const all = [...line.matchAll(amountRe)];
    if (!all.length) return;
    const last = all[all.length - 1];
    let amount = parseBRAmount(last[1]);
    if (!amount) return;

    // Sinal: respeita "-" original; se não houver, usa sufixo D (débito) / C (crédito)
    const raw = last[1].replace(/\s/g, "");
    const suffix = (last[2] || "").toUpperCase();
    const isNegative =
      raw.startsWith("-") || suffix === "D" || suffix === "DB";
    const isPositive = suffix === "C" || suffix === "CR";
    if (isNegative) amount = -Math.abs(amount);
    else if (isPositive) amount = Math.abs(amount);
    // se nenhum indicador → mantém sinal já interpretado pelo parseBRAmount
    // (nesse caso assumimos débito por padrão se valor parecer "saída")

    // Descrição = trecho entre o fim da data e o início do valor
    const dateEnd = (dateMatch.index ?? 0) + dateMatch[1].length;
    const amtStart = last.index ?? line.length;
    let description = line.slice(dateEnd, amtStart).trim();
    description = description.replace(/^[-–:;|]+/, "").trim();
    if (!description) description = line;

    // Filtra ruído: linhas tipo "saldo anterior", "total", etc.
    if (/^(saldo|total|s\.?\s?anterior)/i.test(description)) return;

    txns.push({
      uid: `gen-${idx}-${date.getTime()}-${amount}`,
      date,
      description,
      amount,
    });
  });

  return txns;
}
