export default {
  routes: [
    {
      // Anlegen aus dem Kalkulator. Oeffentlich, aber rate-limited im Next-Proxy.
      method: 'POST',
      path: '/quote-requests/submit',
      handler: 'quote-request.submit',
      config: { auth: false },
    },
    {
      // Neu berechnen nach Aenderung der Arbeitswerte (Admin).
      method: 'POST',
      path: '/quote-requests/:documentId/recalculate',
      handler: 'quote-request.recalculate',
    },
    {
      // Angebotsnummer vergeben und Status auf "offered" setzen (Admin).
      method: 'POST',
      path: '/quote-requests/:documentId/issue-offer',
      handler: 'quote-request.issueOffer',
    },
    {
      // Angebots-PDF. Token-basiert, damit der Link auch aus dem Admin-Panel
      // heraus ohne JWT-Header funktioniert.
      method: 'GET',
      path: '/quote-requests/:documentId/offer-pdf',
      handler: 'quote-request.offerPdf',
      config: { auth: false },
    },
    {
      // Ops-Konsole: Arbeitswerte, Notizen und Status speichern (default auth).
      method: 'PUT',
      path: '/ops/quote-requests/:documentId',
      handler: 'quote-request.opsUpdate',
    },
  ],
};
