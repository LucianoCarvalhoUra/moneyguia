import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const tools = [
  {
    type: "function",
    function: {
      name: "create_expense",
      description: "Cria uma nova despesa no sistema financeiro do usuário. Use quando o usuário pedir para cadastrar, adicionar ou registrar uma despesa/gasto/conta.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Descrição da despesa" },
          amount: { type: "number", description: "Valor da despesa em reais (BRL)" },
          due_date: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD" },
          expense_date: { type: "string", description: "Data da despesa no formato YYYY-MM-DD. Se não informada, usar a mesma do vencimento." },
          category_name: { type: "string", description: "Nome da categoria da despesa (ex: Alimentação, Transporte, Saúde, etc.)" },
          is_paid: { type: "boolean", description: "Se a despesa já foi paga. Padrão: false" },
          payment_method: { type: "string", enum: ["pix", "account", "credit_card"], description: "Forma de pagamento. Padrão: pix" },
          observation: { type: "string", description: "Observação adicional (opcional)" },
        },
        required: ["description", "amount", "due_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_income",
      description: "Cria uma nova receita/ganho no sistema financeiro do usuário. Use quando o usuário pedir para cadastrar, adicionar ou registrar uma receita/ganho/entrada.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título da receita" },
          amount: { type: "number", description: "Valor da receita em reais (BRL)" },
          receive_date: { type: "string", description: "Data de recebimento no formato YYYY-MM-DD" },
          category_name: { type: "string", description: "Nome da categoria da receita (ex: Salário, Freelance, Investimentos, etc.)" },
          is_received: { type: "boolean", description: "Se a receita já foi recebida. Padrão: false" },
          description: { type: "string", description: "Descrição adicional (opcional)" },
        },
        required: ["title", "amount", "receive_date"],
        additionalProperties: false,
      },
    },
  },
];

async function findOrCreateExpenseCategory(
  supabase: any,
  userId: string,
  categoryName: string
): Promise<string | null> {
  if (!categoryName) return null;
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", categoryName)
    .limit(1);
  if (data && data.length > 0) return data[0].id;
  const { data: newCat } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: categoryName, icon: "📦", color: "category-other" })
    .select("id")
    .single();
  return newCat?.id || null;
}

async function findOrCreateIncomeCategory(
  supabase: any,
  userId: string,
  categoryName: string
): Promise<string | null> {
  if (!categoryName) return null;
  const { data } = await supabase
    .from("income_categories")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", categoryName)
    .limit(1);
  if (data && data.length > 0) return data[0].id;
  const { data: newCat } = await supabase
    .from("income_categories")
    .insert({ user_id: userId, name: categoryName, icon: "💰", color: "category-income-other" })
    .select("id")
    .single();
  return newCat?.id || null;
}

async function executeToolCall(
  supabase: any,
  userId: string,
  toolName: string,
  args: any
): Promise<string> {
  try {
    if (toolName === "create_expense") {
      const categoryId = args.category_name
        ? await findOrCreateExpenseCategory(supabase, userId, args.category_name)
        : null;

      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("expenses").insert({
        user_id: userId,
        description: args.description,
        amount: args.amount,
        due_date: args.due_date,
        expense_date: args.expense_date || args.due_date || today,
        category_id: categoryId,
        is_paid: args.is_paid ?? false,
        payment_method: args.payment_method || "pix",
        observation: args.observation || null,
        is_recurring: false,
      }).select("id, description, amount, due_date").single();

      if (error) return JSON.stringify({ success: false, error: error.message });
      return JSON.stringify({
        success: true,
        message: `Despesa "${data.description}" de R$ ${Number(data.amount).toFixed(2)} criada com sucesso para ${data.due_date}.`,
        data,
      });
    }

    if (toolName === "create_income") {
      const categoryId = args.category_name
        ? await findOrCreateIncomeCategory(supabase, userId, args.category_name)
        : null;

      const { data, error } = await supabase.from("incomes").insert({
        user_id: userId,
        title: args.title,
        amount: args.amount,
        receive_date: args.receive_date,
        category_id: categoryId,
        is_received: args.is_received ?? false,
        description: args.description || null,
        is_recurring: false,
      }).select("id, title, amount, receive_date").single();

      if (error) return JSON.stringify({ success: false, error: error.message });
      return JSON.stringify({
        success: true,
        message: `Receita "${data.title}" de R$ ${Number(data.amount).toFixed(2)} criada com sucesso para ${data.receive_date}.`,
        data,
      });
    }

    return JSON.stringify({ success: false, error: "Tool desconhecida" });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message || "Erro ao executar ação" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, financialContext, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é o KeepMoney AI, um assistente financeiro pessoal inteligente e amigável. Você tem acesso completo aos dados financeiros do usuário e pode CRIAR despesas e receitas quando solicitado.

DADOS FINANCEIROS DO USUÁRIO:
${financialContext}

INSTRUÇÕES:
- Responda SEMPRE em português do Brasil.
- Use os dados acima para personalizar suas respostas. Cite valores, categorias e datas específicos.
- Seja direto, prático e amigável. Use emojis com moderação.
- Formate valores monetários no padrão brasileiro (R$ 1.234,56).
- Quando o usuário perguntar sobre gastos, receitas ou saldo, use os dados reais.
- Ofereça dicas de economia baseadas nos padrões de gastos do usuário.
- Use markdown para formatar suas respostas.
- Mantenha respostas concisas mas informativas.

CRIAÇÃO DE DESPESAS/RECEITAS:
- Quando o usuário pedir para cadastrar, adicionar ou registrar uma despesa ou receita, use as ferramentas disponíveis.
- Se o usuário não informar a data, use a data de hoje (${new Date().toISOString().split("T")[0]}).
- Se o usuário não informar a categoria, tente inferir pela descrição ou pergunte.
- Após criar, confirme com os detalhes do que foi criado.
- Se o usuário falar algo como "gastei 50 reais no mercado", interprete como uma despesa a ser criada.
- Se o usuário falar algo como "recebi 5000 de salário", interprete como uma receita a ser criada.`;

    // First call: non-streaming to check for tool calls
    const firstResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
        stream: false,
      }),
    });

    if (!firstResponse.ok) {
      const status = firstResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para a IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await firstResponse.text();
      console.error("AI gateway error:", status, t);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const firstResult = await firstResponse.json();
    const choice = firstResult.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    // If no tool calls, stream the response directly
    if (!toolCalls || toolCalls.length === 0) {
      const streamResponse = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: true,
        }),
      });

      return new Response(streamResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Execute tool calls
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase config missing for tool execution");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const toolResults: any[] = [];
    const createdItems: string[] = [];

    for (const tc of toolCalls) {
      const args = typeof tc.function.arguments === "string"
        ? JSON.parse(tc.function.arguments)
        : tc.function.arguments;
      const result = await executeToolCall(supabase, userId, tc.function.name, args);
      toolResults.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
      try {
        const parsed = JSON.parse(result);
        if (parsed.success) createdItems.push(parsed.message);
      } catch {}
    }

    // Second call with tool results - stream the final response
    const followUpMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
      choice.message,
      ...toolResults,
    ];

    const finalResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: followUpMessages,
        stream: true,
      }),
    });

    if (!finalResponse.ok) {
      const fallbackMsg = createdItems.length > 0
        ? `✅ ${createdItems.join("\n\n")}`
        : "Ação realizada, mas não foi possível gerar a confirmação detalhada.";
      const encoder = new TextEncoder();
      const body = encoder.encode(
        `data: ${JSON.stringify({ choices: [{ delta: { content: fallbackMsg } }] })}\n\ndata: [DONE]\n\n`
      );
      return new Response(body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Prepend refresh marker so frontend refreshes data
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    await writer.write(
      encoder.encode(`data: ${JSON.stringify({ refresh: true })}\n\n`)
    );

    const reader = finalResponse.body!.getReader();
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("financial-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
