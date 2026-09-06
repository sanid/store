import * as React from 'react';
import type { StrapiApp } from '@strapi/strapi/admin';

const STRAPI_API_URL =
  (typeof window !== 'undefined' && (window as any).strapi?.backendURL) ||
  '';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function formatCents(amount: number | null | undefined, currency: string | null | undefined): string {
  if (typeof amount !== 'number') return '—';
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: (currency || 'eur').toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency || ''}`.trim();
  }
}

function OrdersWidget() {
  const [orders, setOrders] = React.useState<any[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const jwt =
          getCookie('jwtToken') ||
          JSON.parse(
            window.sessionStorage.getItem('jwtToken') ||
              window.localStorage.getItem('jwtToken') ||
              '""'
          );
        if (!jwt) throw new Error('Admin-Session nicht gefunden');

        const params = new URLSearchParams({
          'pagination[pageSize]': '8',
          'sort[0]': 'createdAt:desc',
        });
        const res = await fetch(
          `${STRAPI_API_URL}/content-manager/collection-types/api::order.order?${params}`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        if (active) setOrders(json?.results ?? json?.data ?? []);
      } catch (e: any) {
        if (active) setError(e.message || 'Fehler beim Laden');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <div style={{ fontSize: 12, color: '#b72b1a', padding: 12 }}>{error}</div>;
  }
  if (!orders) {
    return <div style={{ fontSize: 12, color: '#666687', padding: 12 }}>Lade…</div>;
  }
  if (orders.length === 0) {
    return <div style={{ fontSize: 12, color: '#666687', padding: 12 }}>Keine Bestellungen.</div>;
  }

  const statusColors: Record<string, string> = {
    pending: '#f29d41',
    paid: '#328048',
    processing: '#4945ff',
    shipped: '#0c75af',
    delivered: '#328048',
    cancelled: '#b72b1a',
    expired: '#8e8ea9',
    failed: '#b72b1a',
  };

  return (
    <div style={{ padding: '4px 0', maxWidth: '50%' }}>
      {orders.map((o: any) => {
        const color = statusColors[o.status] || '#666687';
        const items: any[] = Array.isArray(o.items) ? o.items : [];
        const firstItem = items[0];
        const itemCount = items.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
        const summary = items
          .map((it) => `${it.quantity || 1}× ${it.name}`)
          .join(' · ');
        const addr = o.shippingAddress as Record<string, string> | null;
        const addrLine = addr
          ? [addr.city, addr.country].filter(Boolean).join(', ')
          : '';
        const promo = o.promoCode
          ? ` · Promo ${o.promoCode}` + (o.discountAmount ? ` (−${formatCents(o.discountAmount, o.currency)})` : '')
          : '';
        const thumbSrc = firstItem?.previewImage || null;
        return (
          <a
            key={o.documentId}
            href={`/admin/content-manager/collection-types/api::order.order/${o.documentId}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: 13,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
              {thumbSrc ? (
                <img
                  src={thumbSrc}
                  alt=""
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 4,
                    objectFit: 'cover',
                    flexShrink: 0,
                    background: '#2a2a3a',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 4,
                    background: '#2a2a3a',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    color: '#666',
                  }}
                >
                  🛒
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                    {o.customerName || o.customerEmail || o.documentId}
                  </span>
                  {o.customerName && o.customerEmail && (
                    <span style={{ fontSize: 11, color: '#a0a0b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {o.customerEmail}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#a0a0b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {itemCount} {itemCount === 1 ? 'Artikel' : 'Artikel'}
                  {summary ? ` — ${summary}` : ''}
                </div>
                <div style={{ fontSize: 11, color: '#7a7a96', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.createdAt ? new Date(o.createdAt).toLocaleString('de-DE') : ''}
                  {addrLine ? ` · ${addrLine}` : ''}
                  {promo}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                {formatCents(o.totalAmount, o.currency)}
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: `${color}33`,
                  color,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {o.status || '—'}
              </span>
              {o.trackingNumber && (
                <span style={{ fontSize: 10, color: '#a0a0b8' }}>
                  {o.trackingCarrier ? `${o.trackingCarrier} · ` : ''}{o.trackingNumber}
                </span>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}

function RefundPanel() {
  const [jwt, setJwt] = React.useState<string | null>(null);
  const [orderStatus, setOrderStatus] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refunding, setRefunding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const documentId = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    const m = window.location.pathname.match(/api::order\.order\/([^/?#]+)/);
    return m ? m[1] : null;
  }, []);

  React.useEffect(() => {
    if (!documentId) return;
    const path = window.location.pathname;
    if (!/api::order\.order/.test(path)) return;

    let active = true;
    (async () => {
      try {
        const token =
          getCookie('jwtToken') ||
          JSON.parse(
            window.sessionStorage.getItem('jwtToken') ||
              window.localStorage.getItem('jwtToken') ||
              '""'
          );
        if (!token) {
          setError('Admin-Session nicht gefunden');
          setLoading(false);
          return;
        }
        if (active) setJwt(token);

        const res = await fetch(
          `${STRAPI_API_URL}/content-manager/collection-types/api::order.order/${documentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        if (active) setOrderStatus(json?.data?.status ?? json?.status ?? null);
      } catch (e: any) {
        if (active) setError(e.message || 'Fehler beim Laden');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [documentId]);

  if (!documentId) return null;

  const canRefund = orderStatus === 'paid' || orderStatus === 'processing';

  async function handleRefund() {
    if (!confirm('Erstattung für diese Bestellung durchführen?')) return;
    setRefunding(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(
        `${STRAPI_API_URL}/api/orders/${documentId}/refund`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'requested_by_customer' }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || data?.error || `Status ${res.status}`);
      }
      setSuccess(true);
      setOrderStatus('refunded');
    } catch (e: any) {
      setError(e.message || 'Erstattung fehlgeschlagen');
    } finally {
      setRefunding(false);
    }
  }

  return (
    <div
      style={{
        border: '1px solid #dcdce4',
        borderRadius: 4,
        padding: 16,
        background: '#fff',
        marginTop: 16,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#666687', marginBottom: 8 }}>
        Erstattung
      </div>
      {loading && <div style={{ fontSize: 12, color: '#666687' }}>Lade…</div>}
      {!loading && error && !refunding && (
        <div style={{ fontSize: 12, color: '#b72b1a' }}>{error}</div>
      )}
      {!loading && success && (
        <div style={{ fontSize: 12, color: '#328048', fontWeight: 600 }}>Erstattung durchgeführt.</div>
      )}
      {!loading && !success && orderStatus === 'refunded' && (
        <div style={{ fontSize: 12, color: '#666687' }}>Bereits erstattet.</div>
      )}
      {!loading && !success && canRefund && (
        <button
          onClick={handleRefund}
          disabled={refunding}
          style={{
            display: 'inline-block',
            padding: '8px 14px',
            background: refunding ? '#a0a0a0' : '#b72b1a',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            cursor: refunding ? 'not-allowed' : 'pointer',
          }}
        >
          {refunding ? 'Wird erstattet…' : 'Erstattung durchführen'}
        </button>
      )}
      {!loading && !success && orderStatus && !canRefund && orderStatus !== 'refunded' && (
        <div style={{ fontSize: 12, color: '#666687' }}>
          Erstattung nicht möglich (Status: {orderStatus}).
        </div>
      )}
      {refunding && error && (
        <div style={{ fontSize: 12, color: '#b72b1a', marginTop: 8 }}>{error}</div>
      )}
    </div>
  );
}

function ProductionPdfPanel() {
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const documentId = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    const m = window.location.pathname.match(/api::order\.order\/([^/?#]+)/);
    return m ? m[1] : null;
  }, []);

  React.useEffect(() => {
    if (!documentId) return;
    const path = window.location.pathname;
    if (!/api::order\.order/.test(path)) return;

    let active = true;
    (async () => {
      try {
        const jwt =
          getCookie('jwtToken') ||
          JSON.parse(
            window.sessionStorage.getItem('jwtToken') ||
              window.localStorage.getItem('jwtToken') ||
              '""'
          );
        if (!jwt) {
          setError('Admin-Session nicht gefunden');
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${STRAPI_API_URL}/content-manager/collection-types/api::order.order/${documentId}`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        const t =
          json?.data?.productionToken ?? json?.productionToken ?? null;
        if (active) {
          setToken(t);
          if (!t) setError('Diese Bestellung hat kein Produktions-Token');
        }
      } catch (e: any) {
        if (active) setError(e.message || 'Fehler beim Laden');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [documentId]);

  if (!documentId) return null;

  const url = token
    ? `${STRAPI_API_URL}/api/orders/${documentId}/production-pdf?token=${encodeURIComponent(token)}`
    : null;

  return (
    <div
      style={{
        border: '1px solid #dcdce4',
        borderRadius: 4,
        padding: 16,
        background: '#fff',
        marginTop: 16,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#666687', marginBottom: 8 }}>
        Produktion
      </div>
      {loading && <div style={{ fontSize: 12, color: '#666687' }}>Lade…</div>}
      {!loading && error && (
        <div style={{ fontSize: 12, color: '#b72b1a' }}>{error}</div>
      )}
      {!loading && url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-block',
            padding: '8px 14px',
            background: '#4945ff',
            color: '#fff',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          📄 Produktions-PDF herunterladen
        </a>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Anfragen (KI-Schnellkalkulator)                                    */
/* ------------------------------------------------------------------ */

const QUOTE_STATUS_COLORS: Record<string, string> = {
  new: '#f29d41',
  in_review: '#4945ff',
  offered: '#0c75af',
  accepted: '#328048',
  declined: '#b72b1a',
  expired: '#8e8ea9',
};

function readJwt(): string | null {
  try {
    return (
      getCookie('jwtToken') ||
      JSON.parse(
        window.sessionStorage.getItem('jwtToken') ||
          window.localStorage.getItem('jwtToken') ||
          '""'
      ) ||
      null
    );
  } catch {
    return null;
  }
}

function QuoteRequestsWidget() {
  const [rows, setRows] = React.useState<any[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const jwt = readJwt();
        if (!jwt) throw new Error('Admin-Session nicht gefunden');
        const params = new URLSearchParams({
          'pagination[pageSize]': '8',
          'sort[0]': 'createdAt:desc',
        });
        const res = await fetch(
          `${STRAPI_API_URL}/content-manager/collection-types/api::quote-request.quote-request?${params}`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        if (active) setRows(json?.results ?? json?.data ?? []);
      } catch (e: any) {
        if (active) setError(e.message || 'Fehler beim Laden');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (error) return <div style={{ fontSize: 12, color: '#b72b1a', padding: 12 }}>{error}</div>;
  if (!rows) return <div style={{ fontSize: 12, color: '#666687', padding: 12 }}>Lade…</div>;
  if (rows.length === 0)
    return <div style={{ fontSize: 12, color: '#666687', padding: 12 }}>Keine Anfragen.</div>;

  return (
    <div style={{ padding: '4px 0', maxWidth: '50%' }}>
      {rows.map((q: any) => {
        const color = QUOTE_STATUS_COLORS[q.status] || '#666687';
        const gross = q.priceBreakdown?.gross;
        const conf = typeof q.aiConfidence === 'number' ? Math.round(q.aiConfidence * 100) : null;
        return (
          <a
            key={q.documentId}
            href={`/admin/content-manager/collection-types/api::quote-request.quote-request/${q.documentId}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: 13,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2, flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600 }}>
                  {q.customerName || q.customerEmail || q.quoteCode}
                </span>
                <span style={{ fontSize: 11, color: '#a0a0b8' }}>{q.quoteCode}</span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#a0a0b8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {q.quantity || 1}× {q.objectLabel || q.objectType || '—'}
              </div>
              <div style={{ fontSize: 11, color: '#7a7a96' }}>
                {q.createdAt ? new Date(q.createdAt).toLocaleString('de-DE') : ''}
                {conf !== null ? ` · Sicherheit ${conf}%` : ''}
                {q.aiSource === 'heuristic' ? ' · ohne Bildanalyse' : ''}
              </div>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}
            >
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                {formatCents(gross, 'eur')}
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: `${color}33`,
                  color,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {q.status || '—'}
              </span>
              {q.offerNumber && (
                <span style={{ fontSize: 10, color: '#a0a0b8' }}>{q.offerNumber}</span>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}

function btnStyle(bg: string, busy: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    background: busy ? '#a0a0a0' : bg,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: busy ? 'not-allowed' : 'pointer',
    textAlign: 'center',
  };
}

function linkStyle(bg: string): React.CSSProperties {
  return {
    display: 'block',
    padding: '8px 14px',
    background: bg,
    color: '#fff',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    textAlign: 'center',
  };
}

function QuoteOfferPanel() {
  const [entry, setEntry] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);

  const documentId = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    const m = window.location.pathname.match(/api::quote-request\.quote-request\/([^/?#]+)/);
    return m ? m[1] : null;
  }, []);

  const load = React.useCallback(async () => {
    if (!documentId) return;
    try {
      const jwt = readJwt();
      if (!jwt) throw new Error('Admin-Session nicht gefunden');
      const res = await fetch(
        `${STRAPI_API_URL}/content-manager/collection-types/api::quote-request.quote-request/${documentId}`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      setEntry(json?.data ?? json ?? null);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  React.useEffect(() => {
    if (!documentId) return;
    void load();
  }, [documentId, load]);

  if (!documentId) return null;

  async function action(path: string, label: string) {
    setBusy(label);
    setError(null);
    setNote(null);
    try {
      const jwt = readJwt();
      const res = await fetch(`${STRAPI_API_URL}/api/quote-requests/${documentId}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || data?.error || `Status ${res.status}`);
      await load();
      setNote(
        path === 'recalculate'
          ? 'Preis neu berechnet. Seite neu laden, um die Felder zu aktualisieren.'
          : data?.alreadyIssued
            ? `Angebot bestand bereits: ${data.offerNumber}`
            : `Angebot ${data.offerNumber} erstellt.`
      );
    } catch (e: any) {
      setError(e.message || 'Aktion fehlgeschlagen');
    } finally {
      setBusy(null);
    }
  }

  const gross = entry?.priceBreakdown?.gross;
  const preview = entry?.customerPreviewGross;
  const drift =
    typeof gross === 'number' && typeof preview === 'number' && Math.abs(gross - preview) > 100
      ? gross - preview
      : null;

  const pdfUrl =
    entry?.offerNumber && entry?.offerToken
      ? `${STRAPI_API_URL}/api/quote-requests/${documentId}/offer-pdf?token=${encodeURIComponent(
          entry.offerToken
        )}`
      : null;

  return (
    <div
      style={{
        border: '1px solid #dcdce4',
        borderRadius: 4,
        padding: 16,
        background: '#fff',
        marginTop: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          color: '#666687',
          marginBottom: 8,
        }}
      >
        Angebot
      </div>

      {loading && <div style={{ fontSize: 12, color: '#666687' }}>Lade…</div>}
      {error && <div style={{ fontSize: 12, color: '#b72b1a', marginBottom: 8 }}>{error}</div>}
      {note && <div style={{ fontSize: 12, color: '#328048', marginBottom: 8 }}>{note}</div>}

      {!loading && entry && (
        <>
          <div style={{ fontSize: 12, color: '#32324d', marginBottom: 10, lineHeight: 1.6 }}>
            <div>
              Aktuell: <strong>{formatCents(gross, 'eur')}</strong> brutto
            </div>
            {drift !== null && (
              <div style={{ color: '#d9822b' }}>
                Weicht {drift > 0 ? '+' : ''}
                {formatCents(drift, 'eur')} von der Kundenvorschau ab
              </div>
            )}
            {entry.offerNumber && (
              <div style={{ color: '#666687' }}>
                {entry.offerNumber}
                {entry.validUntil
                  ? ` · gültig bis ${new Date(entry.validUntil).toLocaleDateString('de-DE')}`
                  : ''}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => action('recalculate', 'recalculate')}
              disabled={Boolean(busy)}
              style={btnStyle('#4945ff', busy === 'recalculate')}
            >
              {busy === 'recalculate' ? 'Berechne…' : '↻ Preis neu berechnen'}
            </button>

            {!entry.offerNumber && (
              <button
                onClick={() => action('issue-offer', 'issue-offer')}
                disabled={Boolean(busy)}
                style={btnStyle('#328048', busy === 'issue-offer')}
              >
                {busy === 'issue-offer' ? 'Erstelle…' : '✓ Angebot erstellen'}
              </button>
            )}

            {pdfUrl && (
              <>
                <a href={pdfUrl} target="_blank" rel="noreferrer" style={linkStyle('#4945ff')}>
                  📄 Angebots-PDF (mit Einschätzung)
                </a>
                <a
                  href={`${pdfUrl}&assessment=false`}
                  target="_blank"
                  rel="noreferrer"
                  style={linkStyle('#666687')}
                >
                  📄 Nur Angebot, ohne Einschätzung
                </a>
              </>
            )}
          </div>

          <div style={{ fontSize: 11, color: '#8e8ea9', marginTop: 10, lineHeight: 1.5 }}>
            Arbeitswerte oben ändern, speichern, dann „Preis neu berechnen“. Erst danach das Angebot
            erstellen — die Nummer wird nur einmal vergeben.
          </div>
        </>
      )}
    </div>
  );
}

export default {
  config: {
    locales: [],
  },
  register(app: StrapiApp) {
    try {
      const widgets = (app as any).widgets;
      if (widgets && typeof widgets.register === 'function') {
        widgets.register({
          icon: () => React.createElement('span', { style: { fontSize: 18 } }, '🧾'),
          title: { id: 'orders-widget.title', defaultMessage: 'Letzte Bestellungen' },
          component: async () => OrdersWidget,
          id: 'recent-orders',
          pluginId: 'order',
        });
        widgets.register({
          icon: () => React.createElement('span', { style: { fontSize: 18 } }, '📐'),
          title: { id: 'quote-requests-widget.title', defaultMessage: 'Neue Anfragen' },
          component: async () => QuoteRequestsWidget,
          id: 'recent-quote-requests',
          pluginId: 'quote-request',
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to register orders widget', e);
    }
  },
  bootstrap(app: StrapiApp) {
    try {
      const cm = app.getPlugin('content-manager') as any;
      if (cm && typeof cm.injectComponent === 'function') {
        cm.injectComponent('editView', 'right-links', {
          name: 'production-pdf-panel',
          Component: ProductionPdfPanel,
        });
        cm.injectComponent('editView', 'right-links', {
          name: 'refund-panel',
          Component: RefundPanel,
        });
        cm.injectComponent('editView', 'right-links', {
          name: 'quote-offer-panel',
          Component: QuoteOfferPanel,
        });
      } else if (cm && cm.apis && typeof cm.apis.addEditViewSidePanel === 'function') {
        cm.apis.addEditViewSidePanel((panels: any[]) => [
          ...panels,
          {
            type: 'production-pdf',
            Component: ProductionPdfPanel,
          },
        ]);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to inject production PDF panel', e);
    }
  },
};
