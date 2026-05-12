"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import {
  formatPrice,
  FREE_SHIPPING_THRESHOLD,
  getShippingRate,
  formatCustomizationForDisplay,
} from "@/lib/utils";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface ShippingAddress {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const t = useTranslations("checkout");
  const tc = useTranslations("countries");
  const tg = useTranslations("countryGroups");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentTotal, setPaymentTotal] = useState(0);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: "",
    lastName: "",
    street: "",
    city: "",
    postalCode: "",
    country: "DE",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; code: string; label: string; percentageDiscount: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  if (items.length === 0 && !clientSecret) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 text-center">
        <h1 className="mb-4 text-2xl font-bold text-primary">{t("title")}</h1>
        <p className="mb-4 text-muted">{t("empty")}</p>
        <Link
          href="/products"
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {t("empty") === "Ihr Warenkorb ist leer." ? "Produkte durchsuchen" : "Browse Products"}
        </Link>
      </div>
    );
  }

  const currentShipping = shippingCost ?? getShippingRate(shippingAddress.country);
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const displayShipping = isFreeShipping ? 0 : currentShipping;
  const discountAmount = promoResult ? Math.floor(subtotal * promoResult.percentageDiscount / 100) : 0;
  const total = subtotal - discountAmount + displayShipping;

  const isAddressValid =
    shippingAddress.firstName.trim() !== "" &&
    shippingAddress.lastName.trim() !== "" &&
    shippingAddress.street.trim() !== "" &&
    shippingAddress.city.trim() !== "" &&
    shippingAddress.postalCode.trim() !== "";

  const handleInitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: items.map((item) => ({
            productId: item.documentId,
            name: item.name,
            basePrice: item.basePrice,
            totalPrice: item.totalPrice,
            quantity: item.quantity,
            customization: item.customization,
            customizationPriceAdjustment: item.customizationPriceAdjustment,
            previewImage: item.image && item.image.startsWith("data:image") ? item.image : undefined,
          })),
          customerEmail: email,
          shippingCountry: shippingAddress.country,
          shippingAddress,
          promoCode: promoResult?.code || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate payment");
      }

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setPaymentTotal(data.totalAmount);
      setShippingCost(data.shippingCost);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (clientSecret) {
    const options: StripeElementsOptions = {
      clientSecret,
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#2563eb",
          colorBackground: "#ffffff",
          colorText: "#1e293b",
          colorDanger: "#dc2626",
          fontFamily: "system-ui, sans-serif",
          borderRadius: "8px",
        },
      },
    };

    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="mb-8 text-3xl font-bold text-primary">{t("paymentDetails")}</h1>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="mb-6 rounded-xl border border-border bg-white p-6">
              <h2 className="mb-3 text-lg font-semibold text-primary">{t("shippingAddress")}</h2>
              <p className="text-sm text-muted">
                {shippingAddress.firstName} {shippingAddress.lastName}<br />
                {shippingAddress.street}<br />
                {shippingAddress.postalCode} {shippingAddress.city}<br />
                {tc(shippingAddress.country as any)}
              </p>
            </div>
            <Elements options={options} stripe={stripePromise}>
              <CheckoutForm
                orderId={orderId}
                totalAmount={paymentTotal}
                clearCart={clearCart}
              />
            </Elements>
          </div>

          <div className="lg:col-span-2">
            <OrderSummary
              items={items}
              subtotal={subtotal}
              shippingCost={shippingCost ?? 0}
              discountAmount={0}
              promoLabel={null}
              total={paymentTotal}
            />
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-border px-3 py-2.5 text-sm text-primary placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold text-primary">{t("title")}</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <form onSubmit={handleInitPayment} className="space-y-5">
            <div className="rounded-xl border border-border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-primary">
                {t("contact")}
              </h2>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-primary"
                >
                  {t("email")}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={t("emailPlaceholder")}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-primary">
                {t("shippingAddress")}
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-primary">
                      {t("firstName")}
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      required
                      value={shippingAddress.firstName}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, firstName: e.target.value })}
                      placeholder={t("firstNamePlaceholder")}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-primary">
                      {t("lastName")}
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      required
                      value={shippingAddress.lastName}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, lastName: e.target.value })}
                      placeholder={t("lastNamePlaceholder")}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="street" className="mb-1.5 block text-sm font-medium text-primary">
                    {t("street")}
                  </label>
                  <input
                    type="text"
                    id="street"
                    required
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                    placeholder={t("streetPlaceholder")}
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium text-primary">
                      {t("postalCode")}
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      required
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      placeholder={t("postalCodePlaceholder")}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-primary">
                      {t("city")}
                    </label>
                    <input
                      type="text"
                      id="city"
                      required
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      placeholder={t("cityPlaceholder")}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-primary">
                    {t("country")}
                  </label>
                  <select
                    id="country"
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                    className={inputCls}
                  >
                    <optgroup label={tg("germany")}>
                      <option value="DE">{tc("DE")}</option>
                    </optgroup>
                    <optgroup label={tg("eu")}>
                      <option value="AT">{tc("AT")}</option>
                      <option value="BE">{tc("BE")}</option>
                      <option value="FR">{tc("FR")}</option>
                      <option value="NL">{tc("NL")}</option>
                      <option value="GB">{tc("GB")}</option>
                    </optgroup>
                    <optgroup label={tg("international")}>
                      <option value="US">{tc("US")}</option>
                      <option value="CA">{tc("CA")}</option>
                    </optgroup>
                  </select>
                </div>

                <div className="rounded-lg bg-surface px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 text-muted"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                        />
                      </svg>
                      <span className="text-sm font-medium text-primary">
                        {isFreeShipping
                          ? t("freeShipping")
                          : t("standardShipping")}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      {isFreeShipping
                        ? t("free")
                        : formatPrice(displayShipping)}
                    </span>
                  </div>
                  {!isFreeShipping && (
                    <p className="mt-1.5 text-xs text-muted">
                      {t("freeShippingHint", {
                        threshold: formatPrice(FREE_SHIPPING_THRESHOLD),
                        remaining: formatPrice(FREE_SHIPPING_THRESHOLD - subtotal),
                      })}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    {t("estimatedDelivery")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-primary">
                Promo Code
              </h2>
              {promoResult ? (
                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      {promoResult.code} — {promoResult.label}
                    </p>
                    <p className="text-xs text-green-600">
                      -{formatPrice(discountAmount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPromoResult(null); setPromoInput(""); }}
                    className="text-xs text-green-700 hover:text-green-900"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                    placeholder="e.g. SUMMER20"
                    className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm text-primary placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!promoInput.trim()) return;
                      setPromoLoading(true);
                      setPromoError("");
                      try {
                        const res = await fetch("/api/validate-promo", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ code: promoInput.trim(), subtotal }),
                        });
                        const data = await res.json();
                        if (data.valid) {
                          if (data.minOrderAmount && subtotal < data.minOrderAmount) {
                            setPromoError(`Minimum order amount is ${(data.minOrderAmount / 100).toFixed(2)}`);
                          } else {
                            setPromoResult(data);
                          }
                        } else {
                          setPromoError(data.error || "Invalid promo code");
                        }
                      } catch {
                        setPromoError("Failed to validate promo code");
                      } finally {
                        setPromoLoading(false);
                      }
                    }}
                    disabled={promoLoading || !promoInput.trim()}
                    className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-primary hover:bg-surface disabled:opacity-50"
                  >
                    {promoLoading ? "..." : "Apply"}
                  </button>
                </div>
              )}
              {promoError && (
                <p className="mt-2 text-xs text-red-600">{promoError}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !isAddressValid}
              className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {loading
                ? t("preparing")
                : t("continueToPayment", { amount: formatPrice(total) })}
            </button>

            <Link
              href="/cart"
              className="block text-center text-sm text-muted hover:text-primary"
            >
              {t("backToCart")}
            </Link>
          </form>
        </div>

        <div className="lg:col-span-2">
          <OrderSummary
            items={items}
            subtotal={subtotal}
            shippingCost={displayShipping}
            discountAmount={discountAmount}
            promoLabel={promoResult?.label || null}
            total={total}
          />
        </div>
      </div>
    </div>
  );
}

function OrderSummary({
  items,
  subtotal,
  shippingCost,
  discountAmount,
  promoLabel,
  total,
}: {
  items: ReturnType<typeof useCart>["items"];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  promoLabel: string | null;
  total: number;
}) {
  const t = useTranslations("checkout");

  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-primary">
        {t("orderSummary")}
      </h2>
      <div className="space-y-4">
        {items.map((item) => {
          const specs = item.customization && Object.keys(item.customization).length > 0
            ? formatCustomizationForDisplay(item.customization)
            : [];
          return (
            <div key={item.cartItemId} className="rounded-lg border border-stone-200 bg-white">
              <div className="flex items-start gap-3 px-3 py-3">
                {item.image && (
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-surface-dark">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                      {item.quantity}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-primary">{item.name}</p>
                  <p className="mt-0.5 text-xs text-muted">Menge · {item.quantity}</p>
                </div>
                <p className="flex-shrink-0 text-sm font-semibold text-primary">
                  {formatPrice(item.totalPrice * item.quantity)}
                </p>
              </div>
              {specs.length > 0 && (
                <dl className="divide-y divide-stone-100 border-t border-stone-100 text-xs">
                  {specs.map((it) => (
                    <div key={it.key} className="flex items-center justify-between gap-3 px-3 py-1.5">
                      <dt className="text-stone-500">{it.label}</dt>
                      <dd className="flex items-center gap-1.5 font-medium text-stone-800">
                        {it.swatch && (
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-stone-300"
                            style={{ backgroundColor: it.swatch }}
                          />
                        )}
                        <span>{it.value}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <div className="flex justify-between">
          <span className="text-sm text-muted">{t("subtotal")}</span>
          <span className="text-sm font-semibold">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted">{t("shippingCost")}</span>
          <span className="text-sm font-semibold">
            {shippingCost === 0 ? t("free") : formatPrice(shippingCost)}
          </span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-green-600">{promoLabel || t("discount")}</span>
            <span className="text-sm font-semibold text-green-600">
              -{formatPrice(discountAmount)}
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex justify-between">
          <span className="font-semibold text-primary">{t("total")}</span>
          <span className="text-lg font-bold text-primary">
            {formatPrice(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
