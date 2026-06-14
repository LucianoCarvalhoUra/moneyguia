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
    const { prompt, financialData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!prompt || !financialData) throw new Error("Missing required fields");

    const today: string = financialData.today || new Date().toISOString().split("T")[0];
    const todayDate = new Date(today + "T00:00:00");
    const currentMonth = todayDate.getMonth() + 1; // 1-indexed
    const currentYear = todayDate.getFullYear();
    const lastMonthDate = new Date(currentYear, todayDate.getMonth() - 1, 1);
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastMonthYear = lastMonthDate.getFullYear();

    const systemPrompt = `Você é um analista financeiro especializado em relatórios pessoais. Seu trabalho é receber dados financeiros de um usuário e um pedido em linguagem natural, processar os dados e retornar um relatório estruturado em JSON.

REGRA ABSOLUTA: Retorne APENAS um objeto JSON válido. Zero texto extra, zero markdown, zero blocos de código. O JSON deve começar com { e terminar com }.

REGRAS DE NEGÓCIO:
1. Responda em português do Brasil.
2. Se o pedido não for sobre finanças pessoais (ex: perguntar sobre capital de país, receitas culinárias, etc.), retorne o JSON com "valid": false e "invalidMessage" preenchido.
3. Se após filtrar os dados não houver registros, retorne o JSON com "isEmpty": true.
4. Processe os dados brutos — filtre, agrupe e calcule os valores conforme o pedido.
5. Hoje é: ${today} (formato YYYY-MM-DD)
6. "Este mês" = mês ${currentMonth}/${currentYear}
7. "Mês passado" = mês ${lastMonth}/${lastMonthYear}
8. "Este ano" = ano ${currentYear}
9. As datas nos dados estão no formato "YYYY-MM-DD". Use substring(0,7) para comparar "YYYY-MM".

ESTRUTURA OBRIGATÓRIA DO JSON (todos os campos são obrigatórios):
{
  "valid": true,
  "invalidMessage": null,
  "title": "Título descritivo e específico do relatório",
  "subtitle": "Período ou filtro aplicado (ex: 'Junho 2025' ou 'Janeiro a Junho 2025')",
  "kpis": [
    {
      "label": "Nome da métrica",
      "value": "R$ X.XXX,XX",
      "subtext": "Informação adicional opcional",
      "color": "green"
    }
  ],
  "chartType": "pie",
  "chartTitle": "Título descritivo do gráfico",
  "chartData": [],
  "chartConfig": {},
  "tableColumns": [],
  "tableRows": [],
  "isEmpty": false,
  "emptyMessage": null
}

TIPOS DE GRÁFICO E SEUS FORMATOS:

GRÁFICO "pie" — Para distribuições e proporções (por categoria, por conta, etc.):
  "chartData": [{"name": "Alimentação", "value": 1234.56}, {"name": "Transporte", "value": 567.89}]
  "chartConfig": {"nameKey": "name", "valueKey": "value"}
  QUANDO USAR: "por categoria", "distribuição", "divisão", "proporção", "quais categorias"

GRÁFICO "bar" — Para comparações entre grupos ou múltiplos valores por período:
  "chartData": [{"name": "Jan", "Receitas": 5000.00, "Despesas": 3200.00}]
  "chartConfig": {"xKey": "name", "bars": [{"key": "Receitas", "color": "#10b981", "label": "Receitas"}, {"key": "Despesas", "color": "#ef4444", "label": "Despesas"}]}
  QUANDO USAR: balanço mensal, comparação receitas vs despesas, comparação entre meses

GRÁFICO "line" — Para evolução temporal e tendências:
  "chartData": [{"name": "Jan/25", "Saldo": 2000.00}, {"name": "Fev/25", "Saldo": 2500.00}]
  "chartConfig": {"xKey": "name", "lines": [{"key": "Saldo", "color": "#3b82f6", "label": "Saldo"}]}
  QUANDO USAR: evolução ao longo do tempo, tendência, histórico mensal de um único valor

GRÁFICO "none": quando nenhum gráfico fizer sentido para o relatório.

KPIs (sempre inclua de 2 a 4 KPIs relevantes para o relatório):
  Exemplos: Total Gasto, Total Recebido, Saldo Líquido, Média Mensal, Maior Gasto, Número de Transações.
  Cores: "green" (positivo/receita), "red" (gasto/negativo), "blue" (neutro/total), "amber" (atenção), "purple" (outros).
  Formate valores monetários como "R$ X.XXX,XX" (usando vírgula decimal e ponto como separador de milhar).

TABELA:
  "tableColumns": [{"key": "data", "label": "Data", "align": "left"}, {"key": "valor", "label": "Valor", "align": "right"}]
  "tableRows": [{"data": "15/06/2025", "descricao": "Almoço", "valor": "R$ 35,00"}]
  - Inclua as colunas mais relevantes para o relatório (data, descrição, categoria, valor, status).
  - Formate datas como "DD/MM/YYYY".
  - Formate valores monetários como "R$ X.XXX,XX".
  - Ordene por data decrescente (mais recente primeiro).
  - Limite a tabela a no máximo 200 linhas.
  - Se a tabela for de agrupamento (ex: por categoria), as linhas são os grupos com totais.`;

    const userMessage = `PEDIDO DO USUÁRIO: "${prompt}"

DADOS FINANCEIROS:
${JSON.stringify(financialData)}`;

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
          { role: "user", content: userMessage },
        ],
        stream: false,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", status, errText);
      throw new Error("Erro no serviço de IA");
    }

    const aiResult = await response.json();
    const rawContent: string = aiResult.choices?.[0]?.message?.content || "";

    // Strip potential markdown code fences and parse JSON
    let reportJson;
    try {
      const cleaned = rawContent
        .replace(/^```json\s*/im, "")
        .replace(/^```\s*/im, "")
        .replace(/\s*```$/im, "")
        .trim();
      reportJson = JSON.parse(cleaned);
    } catch {
      // Try extracting the first JSON object from the content
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          reportJson = JSON.parse(match[0]);
        } catch {
          console.error("Failed to parse AI JSON:", rawContent);
          throw new Error("Não foi possível interpretar a resposta da IA");
        }
      } else {
        console.error("No JSON found in AI response:", rawContent);
        throw new Error("A IA não retornou um relatório válido");
      }
    }

    return new Response(JSON.stringify(reportJson), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ai-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
