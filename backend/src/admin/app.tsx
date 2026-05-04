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

export default {
  config: {
    locales: [],
  },
  bootstrap(app: StrapiApp) {
    try {
      const cm = app.getPlugin('content-manager') as any;
      if (cm && typeof cm.injectComponent === 'function') {
        cm.injectComponent('editView', 'right-links', {
          name: 'production-pdf-panel',
          Component: ProductionPdfPanel,
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
