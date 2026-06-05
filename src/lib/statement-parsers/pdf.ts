import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker import
// @ts-ignore
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Extrai todo o texto de um PDF (linha a linha, preservando ordem visual).
 */
export async function extractPdfText(file: File | ArrayBuffer): Promise<string> {
  const data =
    file instanceof ArrayBuffer ? file : await (file as File).arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const out: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // agrupa itens por coordenada Y aproximada para reconstruir linhas
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items as any[]) {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, str: item.str });
    }
    const sortedY = [...rows.keys()].sort((a, b) => b - a); // PDF y cresce p/ cima
    for (const y of sortedY) {
      const line = rows
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) out.push(line);
    }
    out.push(""); // separador de página
  }

  return out.join("\n");
}
