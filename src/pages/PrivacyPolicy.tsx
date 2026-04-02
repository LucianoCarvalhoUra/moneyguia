import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import SEO from "@/components/SEO";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <SEO
        title="Política de Privacidade | MoneyGuia - LGPD"
        description="Política de Privacidade do MoneyGuia em conformidade com a LGPD. Saiba como coletamos, usamos e protegemos seus dados pessoais."
        canonicalUrl="https://www.moneyguia.com.br/privacy"
      />
      <PublicHeader />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 hover:bg-white/50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="rounded-2xl sm:rounded-3xl border border-white/40 bg-white/70 p-6 sm:p-10 shadow-2xl backdrop-blur-lg">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Política de Privacidade (LGPD)</h1>
            </div>

            <p className="text-sm text-slate-500 mb-8">Última atualização: 01 de abril de 2026</p>

            <div className="space-y-8 text-slate-600 leading-relaxed text-sm sm:text-base">
              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">1. Introdução</h2>
                <p>
                  A presente Política de Privacidade descreve como o MoneyGuia ("nós", "nosso") coleta, utiliza, armazena e protege os dados pessoais dos usuários ("você"), em conformidade com a Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018) e demais normas aplicáveis.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">2. Dados Coletados</h2>
                <p>Coletamos as seguintes categorias de dados:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Dados de identificação:</strong> nome, endereço de e-mail;</li>
                  <li><strong>Dados financeiros:</strong> receitas, despesas, categorias, metas e contas bancárias inseridas voluntariamente;</li>
                  <li><strong>Dados de uso:</strong> logs de acesso, preferências de navegação e interações com a Plataforma;</li>
                  <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador e sistema operacional.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">3. Finalidade do Tratamento</h2>
                <p>Os dados pessoais são tratados para as seguintes finalidades:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Autenticação e gerenciamento da sua conta;</li>
                  <li>Geração de relatórios, gráficos e análises financeiras personalizadas;</li>
                  <li>Funcionamento da categorização automática por inteligência artificial;</li>
                  <li>Envio de notificações sobre vencimentos e atualizações do serviço;</li>
                  <li>Melhoria contínua da Plataforma e experiência do usuário;</li>
                  <li>Cumprimento de obrigações legais e regulatórias.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">4. Base Legal</h2>
                <p>O tratamento dos seus dados é fundamentado nas seguintes bases legais previstas na LGPD:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Consentimento (Art. 7º, I):</strong> para o aceite dos termos e coleta de dados opcionais;</li>
                  <li><strong>Execução de contrato (Art. 7º, V):</strong> para prestação do serviço contratado;</li>
                  <li><strong>Legítimo interesse (Art. 7º, IX):</strong> para melhorias na Plataforma e prevenção de fraudes;</li>
                  <li><strong>Obrigação legal (Art. 7º, II):</strong> para cumprimento de exigências regulatórias.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">5. Compartilhamento de Dados</h2>
                <p>
                  O MoneyGuia <strong>não vende, aluga ou compartilha</strong> dados pessoais com terceiros para fins comerciais. O compartilhamento somente ocorre nos seguintes cenários:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Com provedores de infraestrutura essenciais para o funcionamento do serviço (ex: hospedagem e banco de dados), sob contratos de confidencialidade;</li>
                  <li>Com processadores de pagamento, estritamente para viabilizar transações financeiras;</li>
                  <li>Por determinação judicial ou para cumprimento de obrigação legal.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">6. Segurança dos Dados</h2>
                <p>
                  Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados, incluindo:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Criptografia em trânsito (TLS/HTTPS) e em repouso;</li>
                  <li>Controle de acesso baseado em políticas de segurança em nível de linha (Row-Level Security);</li>
                  <li>Autenticação segura com verificação de e-mail e proteção contra ataques de força bruta;</li>
                  <li>Monitoramento contínuo de vulnerabilidades e incidentes de segurança.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">7. Retenção de Dados</h2>
                <p>
                  Seus dados pessoais são mantidos enquanto sua conta estiver ativa ou conforme necessário para cumprir nossas obrigações legais. Após a exclusão da conta, os dados são removidos permanentemente no prazo de até 30 dias, salvo obrigações legais de retenção.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">8. Seus Direitos (Art. 18, LGPD)</h2>
                <p>Você possui os seguintes direitos em relação aos seus dados pessoais:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Confirmação e acesso:</strong> saber se tratamos seus dados e obter uma cópia;</li>
                  <li><strong>Correção:</strong> solicitar a atualização de dados incompletos ou incorretos;</li>
                  <li><strong>Anonimização ou bloqueio:</strong> de dados desnecessários ou tratados em desconformidade;</li>
                  <li><strong>Eliminação:</strong> solicitar a exclusão definitiva dos seus dados pessoais;</li>
                  <li><strong>Portabilidade:</strong> solicitar a transferência dos seus dados a outro prestador de serviço;</li>
                  <li><strong>Revogação do consentimento:</strong> retirar o consentimento a qualquer momento;</li>
                  <li><strong>Oposição:</strong> se opor ao tratamento em determinadas circunstâncias.</li>
                </ul>
                <p className="mt-2">
                  Para exercer qualquer desses direitos, utilize a funcionalidade de exclusão de conta nas configurações ou entre em contato pelo e-mail indicado ao final deste documento.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">9. Cookies e Tecnologias de Rastreamento</h2>
                <p>
                  Utilizamos cookies estritamente necessários para manter sua sessão ativa e garantir o funcionamento correto da Plataforma. Não utilizamos cookies de rastreamento para fins publicitários ou de terceiros.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">10. Transferência Internacional de Dados</h2>
                <p>
                  Seus dados podem ser processados em servidores localizados fora do Brasil, sempre em conformidade com as salvaguardas exigidas pela LGPD, incluindo cláusulas contratuais padrão e certificações de segurança dos provedores de infraestrutura.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">11. Alterações nesta Política</h2>
                <p>
                  Esta Política poderá ser atualizada periodicamente. Alterações significativas serão comunicadas por e-mail ou por aviso na Plataforma. Recomendamos que revise esta página regularmente.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">12. Encarregado de Proteção de Dados (DPO)</h2>
                <p>
                  Para questões relacionadas ao tratamento de dados pessoais, entre em contato com nosso Encarregado de Proteção de Dados pelo e-mail:{' '}
                  <a href="mailto:privacidade@moneyguia.com.br" className="text-emerald-600 hover:text-emerald-700 font-medium underline">
                    privacidade@moneyguia.com.br
                  </a>
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">13. Contato</h2>
                <p>
                  Para dúvidas gerais ou solicitações, entre em contato pelo e-mail:{' '}
                  <a href="mailto:contato@moneyguia.com.br" className="text-emerald-600 hover:text-emerald-700 font-medium underline">
                    contato@moneyguia.com.br
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
