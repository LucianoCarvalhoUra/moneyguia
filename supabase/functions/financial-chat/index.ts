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
          category_id: { type: "string", description: "UUID da categoria existente do usuário (use o categoriesMap fornecido)" },
          subcategory_id: { type: "string", description: "UUID da subcategoria existente do usuário (use o categoriesMap fornecido)" },
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
          category_id: { type: "string", description: "UUID da categoria de receita existente do usuário (use o incomeCategoriesMap fornecido)" },
          is_received: { type: "boolean", description: "Se a receita já foi recebida. Padrão: false" },
          description: { type: "string", description: "Descrição adicional (opcional)" },
        },
        required: ["title", "amount", "receive_date"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_category",
      description: "Cria uma nova categoria de despesa para o usuário. Use quando o usuário confirmar que deseja criar uma nova categoria que não existe.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome da categoria" },
          icon: { type: "string", description: "Emoji representativo da categoria (ex: 🚗, 🍔, 🏠)" },
        },
        required: ["name", "icon"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_subcategory",
      description: "Cria uma nova subcategoria dentro de uma categoria de despesa existente.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome da subcategoria" },
          category_id: { type: "string", description: "UUID da categoria pai" },
        },
        required: ["name", "category_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_income_category",
      description: "Cria uma nova categoria de receita para o usuário. Use quando o usuário confirmar que deseja criar uma nova categoria de receita que não existe.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome da categoria de receita" },
          icon: { type: "string", description: "Emoji representativo (ex: 💰, 💼, 📈)" },
        },
        required: ["name", "icon"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_expense",
      description: "Edita/atualiza uma despesa existente. Use quando o usuário pedir para alterar valor, descrição, data, categoria ou status de pagamento de uma despesa.",
      parameters: {
        type: "object",
        properties: {
          expense_id: { type: "string", description: "UUID da despesa a ser editada (use os IDs das despesas listadas no contexto financeiro)" },
          description: { type: "string", description: "Nova descrição (opcional)" },
          amount: { type: "number", description: "Novo valor (opcional)" },
          due_date: { type: "string", description: "Nova data de vencimento YYYY-MM-DD (opcional)" },
          category_id: { type: "string", description: "Novo UUID da categoria (opcional)" },
          subcategory_id: { type: "string", description: "Novo UUID da subcategoria (opcional)" },
          is_paid: { type: "boolean", description: "Marcar como pago/não pago (opcional)" },
          payment_method: { type: "string", enum: ["pix", "account", "credit_card"], description: "Nova forma de pagamento (opcional)" },
        },
        required: ["expense_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_expense",
      description: "Exclui uma despesa existente. Use quando o usuário pedir para remover/excluir/apagar uma despesa. SEMPRE confirme com o usuário antes de excluir.",
      parameters: {
        type: "object",
        properties: {
          expense_id: { type: "string", description: "UUID da despesa a ser excluída" },
        },
        required: ["expense_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_income",
      description: "Edita/atualiza uma receita existente. Use quando o usuário pedir para alterar valor, título, data, categoria ou status de recebimento de uma receita.",
      parameters: {
        type: "object",
        properties: {
          income_id: { type: "string", description: "UUID da receita a ser editada (use os IDs das receitas listadas no contexto financeiro)" },
          title: { type: "string", description: "Novo título (opcional)" },
          amount: { type: "number", description: "Novo valor (opcional)" },
          receive_date: { type: "string", description: "Nova data de recebimento YYYY-MM-DD (opcional)" },
          category_id: { type: "string", description: "Novo UUID da categoria (opcional)" },
          is_received: { type: "boolean", description: "Marcar como recebido/não recebido (opcional)" },
        },
        required: ["income_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_income",
      description: "Exclui uma receita existente. Use quando o usuário pedir para remover/excluir/apagar uma receita. SEMPRE confirme com o usuário antes de excluir.",
      parameters: {
        type: "object",
        properties: {
          income_id: { type: "string", description: "UUID da receita a ser excluída" },
        },
        required: ["income_id"],
        additionalProperties: false,
      },
    },
  },
];

async function executeToolCall(
  supabase: any,
  userId: string,
  toolName: string,
  args: any
): Promise<string> {
  try {
    if (toolName === "create_expense") {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("expenses").insert({
        user_id: userId,
        description: args.description,
        amount: args.amount,
        due_date: args.due_date,
        expense_date: args.expense_date || args.due_date || today,
        category_id: args.category_id || null,
        subcategory_id: args.subcategory_id || null,
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
      const { data, error } = await supabase.from("incomes").insert({
        user_id: userId,
        title: args.title,
        amount: args.amount,
        receive_date: args.receive_date,
        category_id: args.category_id || null,
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

    if (toolName === "create_category") {
      const { data, error } = await supabase.from("categories").insert({
        user_id: userId,
        name: args.name,
        icon: args.icon || "📦",
        color: "category-other",
      }).select("id, name").single();
      if (error) return JSON.stringify({ success: false, error: error.message });
      return JSON.stringify({ success: true, message: `Categoria "${data.name}" criada com sucesso.`, data });
    }

    if (toolName === "create_subcategory") {
      const { data, error } = await supabase.from("subcategories").insert({
        user_id: userId,
        name: args.name,
        category_id: args.category_id,
      }).select("id, name").single();
      if (error) return JSON.stringify({ success: false, error: error.message });
      return JSON.stringify({ success: true, message: `Subcategoria "${data.name}" criada com sucesso.`, data });
    }

    if (toolName === "update_expense") {
      const updateData: any = {};
      if (args.description !== undefined) updateData.description = args.description;
      if (args.amount !== undefined) updateData.amount = args.amount;
      if (args.due_date !== undefined) { updateData.due_date = args.due_date; updateData.expense_date = args.due_date; }
      if (args.category_id !== undefined) updateData.category_id = args.category_id;
      if (args.subcategory_id !== undefined) updateData.subcategory_id = args.subcategory_id;
      if (args.is_paid !== undefined) updateData.is_paid = args.is_paid;
      if (args.payment_method !== undefined) updateData.payment_method = args.payment_method;

      const { data, error } = await supabase.from("expenses")
        .update(updateData)
        .eq("id", args.expense_id)
        .eq("user_id", userId)
        .select("id, description, amount, due_date, is_paid")
        .single();

      if (error) return JSON.stringify({ success: false, error: error.message });
      return JSON.stringify({
        success: true,
        message: `Despesa "${data.description}" atualizada com sucesso. Valor: R$ ${Number(data.amount).toFixed(2)}, Vencimento: ${data.due_date}, Status: ${data.is_paid ? "Pago" : "Pendente"}.`,
        data,
      });
    }

    if (toolName === "delete_expense") {
      const { data: expense } = await supabase.from("expenses")
        .select("description, amount")
        .eq("id", args.expense_id)
        .eq("user_id", userId)
        .single();

      const { error } = await supabase.from("expenses")
        .delete()
        .eq("id", args.expense_id)
        .eq("user_id", userId);

      if (error) return JSON.stringify({ success: false, error: error.message });
      return JSON.stringify({
        success: true,
        message: `Despesa "${expense?.description}" de R$ ${Number(expense?.amount).toFixed(2)} excluída com sucesso.`,
      });
    }

    if (toolName === "update_income") {
      const updateData: any = {};
      if (args.title !== undefined) updateData.title = args.title;
      if (args.amount !== undefined) updateData.amount = args.amount;
      if (args.receive_date !== undefined) updateData.receive_date = args.receive_date;
      if (args.category_id !== undefined) updateData.category_id = args.category_id;
      if (args.is_received !== undefined) updateData.is_received = args.is_received;

      const { data, error } = await supabase.from("incomes")
        .update(updateData)
        .eq("id", args.income_id)
        .eq("user_id", userId)
        .select("id, title, amount, receive_date, is_received")
        .single();

      if (error) return JSON.stringify({ success: false, error: error.message });
      return JSON.stringify({
        success: true,
        message: `Receita "${data.title}" atualizada com sucesso. Valor: R$ ${Number(data.amount).toFixed(2)}, Data: ${data.receive_date}, Status: ${data.is_received ? "Recebido" : "Pendente"}.`,
        data,
      });
    }

    if (toolName === "delete_income") {
      const { data: income } = await supabase.from("incomes")
        .select("title, amount")
        .eq("id", args.income_id)
        .eq("user_id", userId)
        .single();

      const { error } = await supabase.from("incomes")
        .delete()
        .eq("id", args.income_id)
        .eq("user_id", userId);

      if (error) return JSON.stringify({ success: false, error: error.message });
      return JSON.stringify({
        success: true,
        message: `Receita "${income?.title}" de R$ ${Number(income?.amount).toFixed(2)} excluída com sucesso.`,
      });
    }

    if (toolName === "create_income_category") {
      const { data, error } = await supabase.from("income_categories").insert({
        user_id: userId,
        name: args.name,
        icon: args.icon || "💰",
        color: "category-income-other",
      }).select("id, name").single();
      if (error) return JSON.stringify({ success: false, error: error.message });
      return JSON.stringify({ success: true, message: `Categoria de receita "${data.name}" criada com sucesso.`, data });
    }

    return JSON.stringify({ success: false, error: "Tool desconhecida" });
  } catch (e) {
    return JSON.stringify({ success: false, error: (e as Error).message || "Erro ao executar ação" });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, financialContext, userId, categoriesMap, incomeCategoriesMap } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build categories info for the system prompt
    const categoriesInfo = categoriesMap
      ? `\n=== CATEGORIAS DE DESPESA DO USUÁRIO (use os IDs para criar despesas) ===\n${
          categoriesMap.map((c: any) => {
            const subs = c.subcategories?.length
              ? c.subcategories.map((s: any) => `    - ${s.name} (id: ${s.id})`).join("\n")
              : "    (sem subcategorias)";
            return `- ${c.name} (id: ${c.id})\n${subs}`;
          }).join("\n")
        }`
      : "";

    const incomeCategoriesInfo = incomeCategoriesMap
      ? `\n=== CATEGORIAS DE RECEITA DO USUÁRIO (use os IDs para criar receitas) ===\n${
          incomeCategoriesMap.map((c: any) => `- ${c.name} (id: ${c.id})`).join("\n")
        }`
      : "";

    const systemPrompt = `Você é o MoneyGuia, um assistente financeiro pessoal inteligente e amigável. Você tem acesso completo aos dados financeiros do usuário e pode CRIAR despesas e receitas quando solicitado.

DADOS FINANCEIROS DO USUÁRIO:
${financialContext}
${categoriesInfo}
${incomeCategoriesInfo}

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
- IMPORTANTE: Use SEMPRE os IDs das categorias e subcategorias listadas acima. Escolha a categoria e subcategoria mais adequada com base na descrição do usuário.
  - Exemplo: "gastei 20 reais em uber" → use a categoria "Transporte" e a subcategoria correspondente, usando seus IDs.
  - Exemplo: "gastei 50 no mercado" → use a categoria "Alimentação" e a subcategoria correspondente, usando seus IDs.
- **QUANDO NÃO HOUVER CATEGORIA ADEQUADA**: NÃO crie a despesa/receita sem categoria. Em vez disso, PARE e pergunte ao usuário:
  1. Informe que não encontrou uma categoria adequada nas categorias existentes.
  2. Liste as categorias disponíveis para o usuário escolher.
  3. Pergunte se o usuário quer usar uma das existentes ou se deseja que você crie uma nova categoria (e opcionalmente subcategoria).
  4. Se o usuário pedir para criar nova categoria, use a ferramenta create_category primeiro, depois crie a despesa/receita com a categoria criada.
  5. Só prossiga com o cadastro após o usuário confirmar a categoria.
- Após criar, confirme com os detalhes do que foi criado (incluindo categoria e subcategoria usadas).
- Se o usuário falar algo como "gastei 50 reais no mercado", interprete como uma despesa a ser criada.
- Se o usuário falar algo como "recebi 5000 de salário", interprete como uma receita a ser criada.

EDIÇÃO DE DESPESAS/RECEITAS:
- Quando o usuário pedir para editar, alterar, mudar ou corrigir uma despesa ou receita, use update_expense ou update_income.
- Identifique a despesa/receita pelo nome, valor ou data mencionados pelo usuário, e use o ID correspondente dos dados listados acima.
- Se houver ambiguidade (várias despesas com nome parecido), liste as opções e peça ao usuário para escolher.
- Exemplos: "mude o aluguel para 4000", "marque a conta de luz como paga", "altere o valor do condomínio para 1400".

EXCLUSÃO DE DESPESAS/RECEITAS:
- Quando o usuário pedir para excluir, remover, apagar ou deletar uma despesa ou receita, use delete_expense ou delete_income.
- **SEMPRE confirme com o usuário antes de excluir.** Mostre os detalhes (descrição, valor, data) e pergunte "Deseja realmente excluir?".
- Só execute a exclusão APÓS o usuário confirmar explicitamente (ex: "sim", "pode excluir", "confirmo").
- Se houver ambiguidade, liste as opções e peça para o usuário especificar qual.`;

    // First call: non-streaming to check for tool calls
    const firstResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
      // Use the already-obtained response content instead of making a second call
      const content = choice?.message?.content || "";
      if (content) {
        const encoder = new TextEncoder();
        // Send content as a single SSE event for speed
        const body = encoder.encode(
          `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`
        );
        return new Response(body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
      // Fallback: empty response
      const encoder = new TextEncoder();
      const body = encoder.encode(`data: [DONE]\n\n`);
      return new Response(body, {
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

    // Second call with tool results - non-streaming for speed
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
        model: "google/gemini-2.5-flash",
        messages: followUpMessages,
        stream: false,
      }),
    });

    const encoder = new TextEncoder();

    if (!finalResponse.ok) {
      const fallbackMsg = createdItems.length > 0
        ? `✅ ${createdItems.join("\n\n")}`
        : "Ação realizada, mas não foi possível gerar a confirmação detalhada.";
      const body = encoder.encode(
        `data: ${JSON.stringify({ refresh: true })}\n\ndata: ${JSON.stringify({ choices: [{ delta: { content: fallbackMsg } }] })}\n\ndata: [DONE]\n\n`
      );
      return new Response(body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const finalResult = await finalResponse.json();
    const finalContent = finalResult.choices?.[0]?.message?.content || 
      (createdItems.length > 0 ? `✅ ${createdItems.join("\n\n")}` : "Pronto!");

    const body = encoder.encode(
      `data: ${JSON.stringify({ refresh: true })}\n\ndata: ${JSON.stringify({ choices: [{ delta: { content: finalContent } }] })}\n\ndata: [DONE]\n\n`
    );
    return new Response(body, {
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
