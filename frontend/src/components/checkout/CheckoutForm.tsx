"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";

interface CheckoutFormProps {
  orderId: string | null;
  totalAmount: number;
  clearCart: () => void;
}

export default function CheckoutForm({
  orderId,
  totalAmount,
  clearCart,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const t = useTranslations("checkout");
  const locale = useLocale();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${locale}/checkout/success?order_id=${orderId}`,
      },
    });

    if (error) {
      setErrorMessage(error.message || "Payment failed. Please try again.");
      setProcessing(false);
    } else {
      clearCart();
      router.push({ pathname: "/checkout/success", query: { order_id: orderId ?? "" } });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-primary">
          {t("paymentDetails")}
        </h2>
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full cursor-pointer rounded-lg bg-accent py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {processing
          ? t("processing")
          : t("pay", { amount: formatPrice(totalAmount) })}
      </button>

      <p className="text-center text-xs text-muted">
        {t("secured")}
      </p>
    </form>
  );
}
