import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
  pathnames: {
    "/": "/",
    "/products": {
      de: "/produkte",
      en: "/products",
    },
    "/products/[slug]": {
      de: "/produkte/[slug]",
      en: "/products/[slug]",
    },
    "/cart": {
      de: "/warenkorb",
      en: "/cart",
    },
    "/checkout": {
      de: "/kasse",
      en: "/checkout",
    },
    "/checkout/success": {
      de: "/kasse/bestaetigung",
      en: "/checkout/success",
    },
    "/checkout/cancel": {
      de: "/kasse/abbruch",
      en: "/checkout/cancel",
    },
    "/configurator": {
      de: "/konfigurator",
      en: "/configurator",
    },
    "/curtain-configurator": {
      de: "/vorhang-konfigurator",
      en: "/curtain-configurator",
    },
    "/how-to-shop": {
      de: "/so-bestellen",
      en: "/how-to-shop",
    },
    "/order-lookup": {
      de: "/bestellung-verfolgen",
      en: "/order-lookup",
    },
    "/stoffe": "/stoffe",
    "/versand": "/versand",
    "/datenschutz": "/datenschutz",
    "/agb": "/agb",
    "/impressum": "/impressum",
    "/widerrufsbelehrung": "/widerrufsbelehrung",
  },
});

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
