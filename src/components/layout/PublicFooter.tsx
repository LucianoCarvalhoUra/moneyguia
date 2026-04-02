import { Link } from "react-router-dom";
import { Wallet, Mail } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Logo e descrição */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#059669] text-white">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#1e293b]">MoneyGuia</span>
            </Link>
            <p className="mt-4 text-sm text-slate-500">
              Controle financeiro inteligente com IA. Organize suas finanças de forma simples e eficiente.
            </p>
          </div>

          {/* Acesso Rápido */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Acesso Rápido
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  to="/auth"
                  className="text-sm text-slate-600 hover:text-emerald-600 transition-colors"
                >
                  Entrar
                </Link>
              </li>
              <li>
                <Link
                  to="/plans"
                  className="text-sm text-slate-600 hover:text-emerald-600 transition-colors"
                >
                  Planos e Preços
                </Link>
              </li>
              <li>
                <Link
                  to="/checkout"
                  className="text-sm text-slate-600 hover:text-emerald-600 transition-colors"
                >
                  Começar Agora
                </Link>
              </li>
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Recursos
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <span className="text-sm text-slate-600">Dashboard Inteligente</span>
              </li>
              <li>
                <span className="text-sm text-slate-600">Categorização com IA</span>
              </li>
              <li>
                <span className="text-sm text-slate-600">Metas Financeiras</span>
              </li>
              <li>
                <span className="text-sm text-slate-600">Relatórios Avançados</span>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Contato
            </h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-4 w-4" />
                <span>contato@moneyguia.com.br</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} MoneyGuia. Todos os direitos reservados.
            </p>
            <nav className="flex items-center gap-4 text-sm text-slate-500">
              <Link to="/terms" className="hover:text-emerald-600 transition-colors">
                Termos de Uso
              </Link>
              <span className="text-slate-300">|</span>
              <Link to="/privacy" className="hover:text-emerald-600 transition-colors">
                Política de Privacidade
              </Link>
              <span className="text-slate-300">|</span>
              <a href="/sitemap.xml" className="hover:text-emerald-600 transition-colors">
                Sitemap
              </a>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
