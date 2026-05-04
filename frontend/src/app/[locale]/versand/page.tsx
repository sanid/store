import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Versand und Zahlung",
  description: "Informationen zu Versandkosten, Lieferzeiten und Zahlungsmethoden",
};

export default function VersandPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-primary">Versand und Zahlung</h1>

      <div className="prose prose-sm max-w-none text-muted">
        <h2 className="text-primary">Zahlungsmethoden</h2>
        <p>
          Wir bieten folgende Zahlungsmethoden an:
        </p>
        <ul>
          <li><strong>Kreditkarte</strong> (Visa, Mastercard, American Express) – abgewickelt über Stripe</li>
          <li><strong>PayPal</strong> – abgewickelt über Stripe</li>
          <li><strong>SEPA-Lastschrift</strong> – abgewickelt über Stripe</li>
        </ul>
        <p>
          Die Belastung Ihres Kontos erfolgt nach Abschluss der Bestellung.
        </p>

        <h2 className="text-primary">Versandkosten</h2>
        <p>
          Alle Preise verstehen sich als Endpreise gemäß § 19 UStG (Kleinunternehmerregelung). Es wird keine Umsatzsteuer ausgewiesen.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-left font-medium text-primary">Versandziel</th>
                <th className="py-2 pr-4 text-left font-medium text-primary">Versandart</th>
                <th className="py-2 text-left font-medium text-primary">Kosten</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">Deutschland</td>
                <td className="py-2 pr-4">DHL / DPD</td>
                <td className="py-2">[4,99 €]</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4">EU</td>
                <td className="py-2 pr-4">DHL / DPD</td>
                <td className="py-2">[9,99 €]</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Weltweit</td>
                <td className="py-2 pr-4">DHL International</td>
                <td className="py-2">[19,99 €]</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-primary">Lieferzeiten</h2>
        <p>
          Da unsere Produkte individuell nach Ihren Spezifikationen angefertigt werden, beträgt die Lieferzeit in der Regel <strong>3–7 Werktage</strong> nach Eingang der Zahlung. Die genaue Lieferzeit hängt von der Komplexität Ihrer Konfiguration ab.
        </p>
        <p>
          Lieferzeiten in andere Länder können abweichen.
        </p>

        <h2 className="text-primary">Versandbestätigung</h2>
        <p>
          Nach Versand Ihrer Bestellung erhalten Sie eine E-Mail mit der Sendungsnummer, mit der Sie den Lieferstatus online verfolgen können.
        </p>
      </div>
    </div>
  );
}
