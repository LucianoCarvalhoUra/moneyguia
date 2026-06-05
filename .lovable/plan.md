# Conciliação Bancária por Extrato

Nova funcionalidade que permite importar extratos dos principais bancos (Itaú, Santander, C6) e conferir os lançamentos do sistema contra o extrato, sinalizando divergências e permitindo incluir os itens faltantes (despesas ou receitas) de forma seletiva.

## Fluxo do Usuário

1. **Acessa** nova página em `/conciliacao` (link na sidebar, dentro de "Contas").
2. **Seleciona o banco** (Itaú, Santander, C6) e a **conta bancária** destino.
3. **Faz upload** do extrato (`.ofx`, `.csv` ou `.txt` exportado do internet banking).
4. **Vê uma prévia** com todos os lançamentos extraídos: data, descrição, valor, tipo (crédito/débito). Pode desmarcar linhas que não quer considerar.
5. Clica em **"Iniciar conferência"**.
6. Sistema mostra três grupos:
   - **Conferidos** (match exato com lançamento do sistema): data ± 3 dias e valor igual.
   - **Divergentes** (valor parecido mas dados diferentes): destaca o que diverge.
   - **Faltantes no sistema** (estão no extrato e não no sistema): usuário escolhe categoria, conta e marca para incluir como despesa ou receita.
7. Itens **ignorados** (desmarcados) não geram lançamento.
8. Clica em **"Confirmar inclusões"** → sistema cria as despesas/receitas marcadas em lote.

## Arquivos Novos

```text
src/pages/Reconciliation.tsx              # Página principal (wizard 3 etapas)
src/components/reconciliation/
  ├── BankSelector.tsx                    # Escolha banco + conta
  ├── StatementUploader.tsx               # Upload + parsing
  ├── StatementPreview.tsx                # Prévia editável
  ├── MatchResults.tsx                    # Resultado do batimento
  └── MissingItemRow.tsx                  # Linha com selects de categoria
src/lib/statement-parsers/
  ├── index.ts                            # Roteador por banco
  ├── ofx.ts                              # Parser OFX (universal)
  ├── itau.ts                             # CSV Itaú
  ├── santander.ts                        # CSV Santander
  └── c6.ts                               # CSV C6
src/lib/reconciliation.ts                 # Lógica de matching
```

## Detalhes Técnicos

**Parsing**
- OFX: regex sobre tags `<STMTTRN>`, `<DTPOSTED>`, `<TRNAMT>`, `<MEMO>`. Funciona para todos os bancos que oferecem OFX.
- CSV: detecta separador (`;` ou `,`), normaliza datas BR → ISO, valores BR → number. Cada banco tem cabeçalho próprio.
- Auto-detecção: se for OFX (começa com `OFXHEADER`), usa parser OFX; senão, usa parser do banco selecionado.

**Matching algorithm**
```text
para cada txn do extrato:
  candidatos = lançamentos do sistema com data ± 3 dias e mesmo sinal
  match = candidato com |amount - txn.amount| < 0.01 → "Conferido"
  senão, candidato com descrição similar (Levenshtein > 0.7) → "Divergente"
  senão → "Faltante"
```

**Inclusão em lote**
- Usa `addExpense` / `addIncome` dos contexts existentes.
- Para faltantes, defaults sensatos: descrição = memo do extrato, data = data do extrato, conta = a selecionada, `isPaid/isReceived = true`, categoria = escolhida pelo usuário (obrigatória).

**Sem alterações de schema** — usa as tabelas existentes (`expenses`, `incomes`, `bank_accounts`).

## Limitações Iniciais

- Sem persistência da sessão de conciliação (apenas em memória).
- Suporte a OFX e CSV; sem PDF (parsing de PDF é instável).
- Banco e formato precisam casar; se o usuário escolher Itaú e enviar CSV C6, o parser pode falhar — vamos exibir mensagem clara.
