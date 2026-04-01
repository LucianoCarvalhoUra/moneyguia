import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ScrollText } from "lucide-react";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

export default function TermsOfUse() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
                <ScrollText className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Termos de Uso</h1>
            </div>

            <p className="text-sm text-slate-500 mb-8">Última atualização: 01 de abril de 2026</p>

            <div className="space-y-8 text-slate-600 leading-relaxed text-sm sm:text-base">
              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">1. Aceitação dos Termos</h2>
                <p>
                  Ao acessar ou utilizar a plataforma MoneyGuia ("Plataforma"), você declara que leu, compreendeu e concorda integralmente com estes Termos de Uso. Caso não concorde com qualquer disposição, solicitamos que não utilize o serviço.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">2. Descrição do Serviço</h2>
                <p>
                  O MoneyGuia é uma plataforma de gestão financeira pessoal que oferece funcionalidades como registro de receitas e despesas, categorização automática por inteligência artificial, metas financeiras, relatórios e gráficos interativos. O serviço é disponibilizado "como está" e não constitui consultoria financeira, contábil ou de investimentos.
                </p>
                <p className="mt-2">
                  As decisões financeiras tomadas com base nas informações apresentadas pela Plataforma são de inteira responsabilidade do usuário.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">3. Cadastro e Conta</h2>
                <p>
                  Para utilizar a Plataforma, é necessário criar uma conta com um endereço de e-mail válido. O usuário é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.
                </p>
                <p className="mt-2">
                  O MoneyGuia se reserva o direito de suspender ou encerrar contas que violem estes Termos ou que apresentem atividade suspeita.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">4. Elegibilidade e Idade Mínima</h2>
                <p>
                  O MoneyGuia é livre para todas as idades. Usuários menores de 16 anos declaram estar assistidos por seus responsáveis legais, conforme previsto no Estatuto da Criança e do Adolescente (Lei 8.069/90) e na LGPD (Lei 13.709/18).
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">5. Planos e Assinaturas</h2>
                <p>
                  A Plataforma oferece planos gratuitos e pagos. Os planos pagos concedem acesso a funcionalidades adicionais, conforme descrito na página de planos. Os valores, ciclos de cobrança e condições de renovação são informados antes da contratação.
                </p>
                <p className="mt-2">
                  O cancelamento da assinatura pode ser realizado a qualquer momento pelo painel de configurações, sendo que o acesso às funcionalidades premium permanece ativo até o final do período já pago.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">6. Propriedade Intelectual</h2>
                <p>
                  Todo o conteúdo da Plataforma — incluindo, mas não se limitando a, textos, logotipos, ícones, imagens, código-fonte, design de interface e algoritmos de inteligência artificial — é de propriedade exclusiva do MoneyGuia e está protegido pelas leis brasileiras de propriedade intelectual (Lei 9.610/98 e Lei 9.279/96).
                </p>
                <p className="mt-2">
                  É vedada a reprodução, distribuição, modificação ou engenharia reversa de qualquer parte da Plataforma sem autorização prévia e expressa.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">7. Uso Aceitável</h2>
                <p>O usuário compromete-se a utilizar a Plataforma de forma ética e legal, sendo vedado:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Inserir dados falsos, fraudulentos ou que violem direitos de terceiros;</li>
                  <li>Tentar acessar contas de outros usuários ou áreas restritas do sistema;</li>
                  <li>Utilizar bots, scripts ou automações não autorizadas;</li>
                  <li>Praticar atos que comprometam a segurança, estabilidade ou disponibilidade da Plataforma.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">8. Limitação de Responsabilidade</h2>
                <p>
                  O MoneyGuia não se responsabiliza por perdas financeiras, danos diretos ou indiretos decorrentes do uso da Plataforma. A ferramenta é um auxílio à organização financeira e não substitui aconselhamento profissional.
                </p>
                <p className="mt-2">
                  Não garantimos disponibilidade ininterrupta do serviço, embora nos esforcemos para manter alta disponibilidade e segurança.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">9. Cancelamento e Exclusão de Conta</h2>
                <p>
                  O usuário pode solicitar a exclusão definitiva de sua conta a qualquer momento nas configurações da Plataforma. Ao excluir a conta, todos os dados pessoais e financeiros serão permanentemente removidos, conforme previsto na LGPD, ressalvadas as obrigações legais de retenção.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">10. Modificações nos Termos</h2>
                <p>
                  O MoneyGuia poderá atualizar estes Termos a qualquer momento. Em caso de alterações significativas, o usuário será notificado por e-mail ou por meio de aviso na Plataforma. O uso continuado após a notificação constitui aceitação dos novos Termos.
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">11. Legislação Aplicável e Foro</h2>
                <p>
                  Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca do domicílio do usuário para dirimir quaisquer controvérsias, conforme previsto no Código de Defesa do Consumidor (Lei 8.078/90).
                </p>
              </section>

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3">12. Contato</h2>
                <p>
                  Em caso de dúvidas sobre estes Termos, entre em contato pelo e-mail:{' '}
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
