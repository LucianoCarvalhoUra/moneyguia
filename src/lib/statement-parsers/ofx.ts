import type { StatementTxn } from "./index";

export function parseOFX(text: string): StatementTxn[] {
  const txns: StatementTxn[] = [];
  const blocks = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) || [];

  blocks.forEach((block, idx) => {
    const dt = (block.match(/<DTPOSTED>([^<\r\n]+)/i) || [])[1] || "";
    const amt = (block.match(/<TRNAMT>([^<\r\n]+)/i) || [])[1] || "0";
    const memo = (block.match(/<MEMO>([^<\r\n]+)/i) || [])[1] || "";
    const name = (block.match(/<NAME>([^<\r\n]+)/i) || [])[1] || "";
    const fitid = (block.match(/<FITID>([^<\r\n]+)/i) || [])[1] || `ofx-${idx}`;

    // DTPOSTED format: YYYYMMDD or YYYYMMDDHHMMSS
    const y = Number(dt.slice(0, 4));
    const m = Number(dt.slice(4, 6));
    const d = Number(dt.slice(6, 8));
    if (!y || !m || !d) return;

    txns.push({
      uid: fitid.trim(),
      date: new Date(y, m - 1, d, 12, 0, 0),
      description: (memo || name).trim(),
      amount: Number(amt.replace(",", ".")),
    });
  });

  return txns;
}
