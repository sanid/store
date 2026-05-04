import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Informationen zum Datenschutz und zur Verarbeitung personenbezogener Daten",
};

export default function DatenschutzPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-primary">Datenschutzerklärung</h1>

      <div className="prose prose-sm max-w-none text-muted">
        <h2 className="text-primary">1. Datenschutz auf einen Blick</h2>
        <h3>Allgemeine Hinweise</h3>
        <p>
          Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
        </p>

        <h2 className="text-primary">2. Verantwortliche Stelle</h2>
        <p>
          Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
          <br /><br />
          [Vorname Nachname / Firmenname]
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ Ort]
          <br /><br />
          E-Mail: [info@customstore.com]
        </p>
        <p>
          <strong>Hinweis:</strong> Umsatzsteuerbefreit nach § 19 UStG (Kleinunternehmerregelung).
        </p>

        <h2 className="text-primary">3. Datenerfassung auf dieser Website</h2>
        <h3>Cookies</h3>
        <p>
          Diese Website verwendet technisch notwendige Cookies, um den Betrieb der Seite zu gewährleisten (z. B. Warenkorb-Funktion). Es werden keine Tracking-Cookies eingesetzt.
        </p>

        <h3>Server-Log-Dateien</h3>
        <p>
          Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies sind:
        </p>
        <ul>
          <li>Browsertyp und Browserversion</li>
          <li>verwendetes Betriebssystem</li>
          <li>Referrer URL</li>
          <li>Hostname des zugreifenden Rechners</li>
          <li>Uhrzeit der Serveranfrage</li>
          <li>IP-Adresse</li>
        </ul>

        <h2 className="text-primary">4. Zahlungsabwicklung</h2>
        <p>
          Für die Abwicklung von Zahlungen arbeiten wir mit Stripe, Inc. zusammen. Beim Checkout werden Sie auf die Zahlungsseiten von Stripe weitergeleitet. Stripe verarbeitet Zahlungsdaten gemäß der eigenen Datenschutzerklärung:{" "}
          <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover">
            https://stripe.com/de/privacy
          </a>
        </p>
        <p>
          Wir speichern keine Kreditkartendaten. Die Speicherung Ihrer Bestelldaten (Name, Adresse, bestellte Produkte mit Konfigurationen) erfolgt zur Auftragsabwicklung.
        </p>

        <h2 className="text-primary">5. Ihre Rechte</h2>
        <p>
          Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung sowie ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten.
        </p>

        <h2 className="text-primary">6. SSL- bzw. TLS-Verschlüsselung</h2>
        <p>
          Diese Seite nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von &quot;http://&quot; auf &quot;https://&quot; wechselt.
        </p>
      </div>
    </div>
  );
}
