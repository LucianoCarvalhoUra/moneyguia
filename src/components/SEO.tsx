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
  title: "MoneyGuia | Controle Financeiro Inteligente com IA",
  description:
    "Organize suas finanças em minutos com o MoneyGuia. Controle gastos, cartões e investimentos em uma plataforma inteligente com IA. Comece seu teste grátis agora!",
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
        `${selector}="${selectorValue}"]`
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
  }, [title, description, canonicalUrl, ogImage, ogType, noIndex]);

  return null;
}

// Pre-configured SEO components for common pages
export function LandingPageSEO() {
  return (
    <SEO
      title="MoneyGuia | Controle Financeiro Inteligente com IA"
      description="Organize suas finanças em minutos com o MoneyGuia. Controle gastos, cartões e investimentos em uma plataforma inteligente com IA. Comece seu teste grátis agora!"
      canonicalUrl="https://www.moneyguia.com.br/"
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