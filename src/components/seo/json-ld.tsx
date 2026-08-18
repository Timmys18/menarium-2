import type { ItemType } from "@prisma/client";

/**
 * Микроразметка отдаётся отдельным компонентом, а не строкой в разметке
 * страницы, чтобы экранирование было в одном месте: `</script>` внутри
 * пользовательского заголовка иначе закрыл бы тег и превратил бы название
 * объявления в исполняемую разметку.
 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

function baseUrl() {
  return process.env.APP_URL ?? "https://menarium.ru";
}

export function OrganizationJsonLd() {
  const url = baseUrl();
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${url}/#organization`,
            name: "Менариум",
            url,
            logo: `${url}/icon.png`,
            description: "Обмен вещами и услугами напрямую между людьми.",
          },
          {
            "@type": "WebSite",
            "@id": `${url}/#website`,
            name: "Менариум",
            url,
            inLanguage: "ru-RU",
            publisher: { "@id": `${url}/#organization` },
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${url}/catalog?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          },
        ],
      }}
    />
  );
}

export type ItemJsonLdInput = {
  id: string;
  title: string;
  description: string;
  category: string;
  type: ItemType;
  city: string | null;
  images: string[];
  createdAt: Date;
  ownerName: string | null;
};

/**
 * Объявление описывается как `Product` с `TradeAction` вместо `Offer` с ценой:
 * на площадке бартера цены нет, и подставлять нулевую было бы неправдой,
 * за которую поисковик справедливо накажет.
 */
export function ItemJsonLd({ item }: { item: ItemJsonLdInput }) {
  const url = `${baseUrl()}/item/${item.id}`;
  const isService = item.type === "SERVICE";

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": isService ? "Service" : "Product",
        "@id": url,
        url,
        name: item.title,
        description: item.description.slice(0, 500),
        category: item.category,
        ...(item.images.length ? { image: item.images } : {}),
        ...(isService ? { serviceType: item.category } : {}),
        ...(item.city ? { areaServed: { "@type": "City", name: item.city } } : {}),
        ...(item.ownerName
          ? { provider: { "@type": "Person", name: item.ownerName } }
          : {}),
        potentialAction: {
          "@type": "TradeAction",
          target: url,
          name: "Предложить обмен",
        },
      }}
    />
  );
}

export function BreadcrumbJsonLd({ trail }: { trail: { name: string; path: string }[] }) {
  const url = baseUrl();
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((entry, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: entry.name,
          item: `${url}${entry.path}`,
        })),
      }}
    />
  );
}
