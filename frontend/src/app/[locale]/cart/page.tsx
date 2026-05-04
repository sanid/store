import type { Metadata } from "next";
import CartContent from "./CartContent";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Cart",
  description: "Your shopping cart",
};

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CartContent />;
}
