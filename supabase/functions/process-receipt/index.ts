import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    if (!fileBase64)      throw new Error("Arquivo não recebido");
    if (!mimeType)        throw new Error("Tipo de arquivo não informado");

    const systemPrompt = `Você é um especialista em leitura e interpretação de comprovantes financeiros brasileiros (recibos, comprovantes de pagamento, transferências bancárias, boletos, etc.).

Sua única tarefa é analisar o arquivo fornecido e retornar EXCLUSIVAMENTE um objeto JSON válido. Zero texto fora do JSON. Zero markdown. Zero explicações. Apenas o JSON.

ESTRUTURA OBRIGATÓRIA (todos os campos devem estar presentes, use null quando não identificado):
{
  "beneficiary": "Nome completo do beneficiário, locador, credor ou destinatário",
  "email": "E-mail encontrado no documento ou null",
  "paymentMethod": "Forma de pagamento identificada (ex: Transferência Bancária, PIX, Boleto, Depósito, etc.)",
  "dueDate": "Data de vencimento no formato YYYY-MM-DD ou null",
  "paymentDate": "Data do pagamento/compensação no formato YYYY-MM-DD ou null",
  "items": [
    {
      "category": "Categoria específica do item (ex: Aluguel, Condomínio, IPTU, Salário, Serviço, Produto, Taxa, etc.)",
      "value": 1234.56,
      "reference": "Descrição detalhada ou referência do item conforme consta no documento"
    }
  ],
  "notes": "Observações adicionais relevantes presentes no documento ou null"
}

REGRAS DE EXTRAÇÃO:
- Se houver múltiplos itens/componentes no valor total, crie uma entrada em "items" para cada um.
- Exemplo: se o comprovante mostra Aluguel R$2.000 + Condomínio R$350 + IPTU R$150, crie 3 items.
- Datas devem estar SEMPRE em formato YYYY-MM-DD.
- Valores monetários devem ser números (float), sem símbolo de moeda.
- Se o documento for uma transferência simples, crie um único item com o valor total.
- Identifique o tipo de documento para classificar corretamente os itens.`;

    const messages: unknown[] = [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${fileBase64}`,
            },
          },
          {
            type: "text",
            text: "Analise este comprovante financeiro e retorne APENAS o JSON estruturado.",
          },
        ],
      },
    ];

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Erro no serviço de IA: ${status}`);
    }

    const aiResult = await response.json();
    const rawContent: string = aiResult.choices?.[0]?.message?.content ?? "";

    // Strip markdown fences if present and parse JSON
    let parsed: unknown;
    try {
      const cleaned = rawContent
        .replace(/^```json\s*/im, "")
        .replace(/^```\s*/im, "")
        .replace(/\s*```$/im, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        console.error("AI response could not be parsed:", rawContent);
        throw new Error("A IA não retornou um JSON válido");
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-receipt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
