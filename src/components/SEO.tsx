import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const defaultConfig = {
  title: "MoneyGuia - Controle de Orçamento Pessoal",
  description:
    "Organize suas finanças com inteligência. O MoneyGuia oferece controle de despesas, lançamentos por IA e gestão de orçamento de forma simples e visual.",
  canonicalUrl: "https://www.moneyguia.com.br/",
  ogImage: "https://www.moneyguia.com.br/og-image.png",
  ogType: "website",
};

export default function SEO({
  title = defaultConfig.title,
  description = defaultConfig.description,
  canonicalUrl = defaultConfig.canonicalUrl,
  ogImage = defaultConfig.ogImage,
  ogType = defaultConfig.ogType,
  noIndex = false,
}: SEOProps) {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper function to update or create meta tag
    const updateMetaTag = (
      selector: string,
      selectorValue: string,
      attribute: string,
      content: string
    ) => {
      let element = document.querySelector(
        `[${selector}="${selectorValue}"]`
      ) as HTMLMetaElement;

      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(selector, selectorValue);
        document.head.appendChild(element);
      }

      element.setAttribute(attribute, content);
    };

    // Update meta tags
    updateMetaTag("name", "description", "content", description);
    updateMetaTag("property", "og:title", "content", title);
    updateMetaTag("property", "og:description", "content", description);
    updateMetaTag("property", "og:type", "content", ogType);
    updateMetaTag("property", "og:image", "content", ogImage);
    updateMetaTag("name", "twitter:card", "content", "summary_large_image");
    updateMetaTag("name", "twitter:title", "content", title);
    updateMetaTag("name", "twitter:description", "content", description);
    updateMetaTag("name", "twitter:image", "content", ogImage);

    // Update canonical link
    let canonicalLink = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement;

    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }

    canonicalLink.setAttribute("href", canonicalUrl);

    // Update robots meta tag
    updateMetaTag(
      "name",
      "robots",
      "content",
      noIndex ? "noindex, nofollow" : "index, follow"
    );

    // JSON-LD support for SoftwareApplication
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "MoneyGuia",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Web",
    };

    let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      document.head.appendChild(script);
    }
    script.text = JSON.stringify(jsonLd);
  }, [title, description, canonicalUrl, ogImage, ogType, noIndex]);

  return null;
}

// Pre-configured SEO components for common pages
export function LandingPageSEO() {
  return (
    <SEO
      title="MoneyGuia - Controle de Orçamento Pessoal"
      description="Organize suas finanças com inteligência. O MoneyGuia oferece controle de despesas, lançamentos por IA e gestão de orçamento de forma simples e visual."
      canonicalUrl="https://www.moneyguia.com.br/"
    />
  );
}

export function AuthSEO() {
  return (
    <SEO
      title="Entrar | MoneyGuia"
      description="Acesse sua conta no MoneyGuia e gerencie suas finanças."
      canonicalUrl="https://www.moneyguia.com.br/auth"
      noIndex={true}
    />
  );
}

export function WelcomeSEO() {
  return (
    <SEO
      title="Bem-vindo | MoneyGuia"
      description="Conheça o MoneyGuia e comece a organizar sua vida financeira agora mesmo."
      canonicalUrl="https://www.moneyguia.com.br/welcome"
    />
  );
}

export function ReconciliationSEO() {
  return (
    <SEO
      title="Conciliação de Fatura | MoneyGuia"
      description="Concilie suas faturas de cartão de crédito com facilidade e precisão."
      canonicalUrl="https://www.moneyguia.com.br/reconciliation"
      noIndex={true}
    />
  );
}

export function DashboardSEO() {
  return (
    <SEO
      title="Dashboard | MoneyGuia - Painel de Controle Financeiro"
      description="Acompanhe suas finanças em tempo real com o dashboard inteligente do MoneyGuia. Visualize gastos, receitas e metas de forma clara."
      canonicalUrl="https://www.moneyguia.com.br/dashboard"
      noIndex={true}
    />
  );
}

export function PlansSEO() {
  return (
    <SEO
      title="Planos | MoneyGuia - Escolha seu Plano de Controle Financeiro"
      description="Escolha o plano ideal para suas necessidades. Do gratuito ao premium, tenha controle total das suas finanças com IA."
      canonicalUrl="https://www.moneyguia.com.br/planos"
    />
  );
}

export function SettingsSEO() {
  return (
    <SEO
      title="Configurações | MoneyGuia"
      description="Gerencie suas configurações de conta, preferências e perfil no MoneyGuia."
      canonicalUrl="https://www.moneyguia.com.br/configuracoes"
      noIndex={true}
    />
  );
}