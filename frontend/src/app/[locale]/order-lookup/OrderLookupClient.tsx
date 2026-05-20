"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Address = {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
};

type Order = {
  orderId: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  currency: string;
  items: Array<{ name: string; quantity: number; totalPrice: number }>;
  shippingAddress?: Address | null;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
  invoiceNumber?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Wartet auf Zahlung",
  paid: "Bezahlt — wird bearbeitet",
  processing: "In Produktion",
  shipped: "Versandt",
  delivered: "Zugestellt",
  cancelled: "Storniert",
  expired: "Abgelaufen",
  failed: "Zahlung fehlgeschlagen",
  refunded: "Erstattet",
};

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: (currency || "eur").toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

const ADDRESS_FIELDS: { key: keyof Address; label: string; placeholder: string; required?: boolean }[] = [
  { key: "firstName", label: "Vorname", placeholder: "Vorname", required: true },
  { key: "lastName", label: "Nachname", placeholder: "Nachname", required: true },
  { key: "street", label: "Straße & Hausnummer", placeholder: "Straße & Hausnummer", required: true },
  { key: "postalCode", label: "PLZ", placeholder: "PLZ", required: true },
  { key: "city", label: "Stadt", placeholder: "Stadt", required: true },
  { key: "country", label: "Land", placeholder: "Land" },
];

export default function OrderLookupClient() {
  const search = useSearchParams();
  const [orderId, setOrderId] = useState(search.get("id") || "");
  const [email, setEmail] = useState(search.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<Address>({
    firstName: "",
    lastName: "",
    street: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressSuccess, setAddressSuccess] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!orderId.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch(
        `/api/order-lookup?id=${encodeURIComponent(orderId.trim())}&email=${encodeURIComponent(email.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Bestellung nicht gefunden");
      }
      setOrder(data);
    } catch (err: any) {
      setError(err.message || "Bestellung nicht gefunden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (search.get("id") && search.get("email")) {
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel() {
    if (!order || !confirm("Bestellung wirklich stornieren? Bei bereits bezahlten Bestellungen wird eine Erstattung ausgelöst.")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch("/api/cancel-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.orderId, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Stornierung fehlgeschlagen");
      }
      setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
    } catch (err: any) {
      setCancelError(err.message || "Stornierung fehlgeschlagen");
    } finally {
      setCancelling(false);
    }
  }

  function startEditAddress() {
    if (!order?.shippingAddress) return;
    setAddressForm({
      firstName: order.shippingAddress.firstName || "",
      lastName: order.shippingAddress.lastName || "",
      street: order.shippingAddress.street || "",
      city: order.shippingAddress.city || "",
      postalCode: order.shippingAddress.postalCode || "",
      country: order.shippingAddress.country || "",
    });
    setAddressError(null);
    setAddressSuccess(false);
    setEditingAddress(true);
  }

  async function handleSaveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setSavingAddress(true);
    setAddressError(null);
    setAddressSuccess(false);
    try {
      const res = await fetch("/api/update-address", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.orderId, email, ...addressForm }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Adressänderung fehlgeschlagen");
      }
      setOrder((prev) =>
        prev ? { ...prev, shippingAddress: data.shippingAddress || addressForm } : prev
      );
      setAddressSuccess(true);
      setEditingAddress(false);
    } catch (err: any) {
      setAddressError(err.message || "Adressänderung fehlgeschlagen");
    } finally {
      setSavingAddress(false);
    }
  }

  const canCancel = order?.status === "pending" || order?.status === "paid";
  const canEditAddress = order?.status === "paid" || order?.status === "processing";

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-4 border border-stone-200 bg-white p-6">
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
            Bestellnummer
          </span>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="mt-1 w-full border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
            placeholder="z. B. fe6fnusyk63k"
            required
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
            E-Mail
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
            placeholder="name@example.com"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-stone-900 px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-stone-700 disabled:opacity-50"
        >
          {loading ? "Lade…" : "Bestellung anzeigen"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {order && (
        <div className="border border-stone-200 bg-white p-6">
          <div className="flex items-baseline justify-between border-b border-stone-200 pb-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500">Bestellung</div>
              <div className="font-mono text-sm">#{order.orderId}</div>
            </div>
            <span className="bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-900">
              {STATUS_LABEL[order.status] || order.status}
            </span>
          </div>

          <div className="mt-4 text-xs text-stone-500">
            Aufgegeben am {new Date(order.createdAt).toLocaleString("de-DE")}
          </div>

          {order.invoiceNumber && (
            <div className="mt-4">
              <a
                href={`/api/invoice?id=${encodeURIComponent(order.orderId)}&email=${encodeURIComponent(email)}`}
                className="inline-flex items-center gap-2 border border-stone-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
              >
                Rechnung herunterladen ({order.invoiceNumber})
              </a>
            </div>
          )}

          {order.trackingNumber && (
            <div className="mt-4 border-l-2 border-stone-900 bg-stone-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                Sendungsnummer
              </div>
              <div className="mt-1 font-mono text-sm">
                {order.trackingNumber}
                {order.trackingCarrier ? ` (${order.trackingCarrier})` : ""}
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-600">
              Artikel
            </div>
            <ul className="divide-y divide-stone-100">
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between py-2 text-sm">
                  <span>
                    {it.name} × {it.quantity}
                  </span>
                  <span className="font-semibold">
                    {formatPrice(it.totalPrice * it.quantity, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-sm font-bold">
              <span>Gesamt</span>
              <span>{formatPrice(order.totalAmount, order.currency)}</span>
            </div>
          </div>

          {order.shippingAddress && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Lieferadresse
                </div>
                {canEditAddress && !editingAddress && (
                  <button
                    onClick={startEditAddress}
                    className="text-xs font-semibold uppercase tracking-wider text-stone-500 transition hover:text-stone-900"
                  >
                    Adresse bearbeiten
                  </button>
                )}
              </div>
              {!editingAddress ? (
                <div className="text-sm leading-relaxed text-stone-700">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                  <br />
                  {order.shippingAddress.street}
                  <br />
                  {order.shippingAddress.postalCode} {order.shippingAddress.city}
                  <br />
                  {order.shippingAddress.country}
                </div>
              ) : (
                <form onSubmit={handleSaveAddress} className="mt-2 space-y-3">
                  {ADDRESS_FIELDS.map(({ key, label, placeholder, required }) => (
                    <label key={key} className="block">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
                        {label}
                      </span>
                      <input
                        type="text"
                        value={addressForm[key]}
                        onChange={(e) =>
                          setAddressForm((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder={placeholder}
                        required={required}
                        className="mt-1 w-full border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
                      />
                    </label>
                  ))}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="bg-stone-900 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-stone-700 disabled:opacity-50"
                    >
                      {savingAddress ? "Speichert…" : "Adresse speichern"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAddress(false)}
                      disabled={savingAddress}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500 transition hover:text-stone-900"
                    >
                      Abbrechen
                    </button>
                  </div>
                  {addressError && <p className="text-sm text-red-600">{addressError}</p>}
                </form>
              )}
              {addressSuccess && (
                <p className="mt-2 text-sm font-semibold text-green-700">Adresse aktualisiert.</p>
              )}
            </div>
          )}

          {canCancel && (
            <div className="mt-6 border-t border-stone-200 pt-4">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-600 transition hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
              >
                {cancelling ? "Wird storniert…" : "Bestellung stornieren"}
              </button>
              {cancelError && <p className="mt-2 text-sm text-red-600">{cancelError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
