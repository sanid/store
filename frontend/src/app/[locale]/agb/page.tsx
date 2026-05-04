import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen (AGB)",
  description: "Allgemeine Geschäftsbedingungen für Bestellungen in unserem Onlineshop",
};

export default function AGBPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-primary">Allgemeine Geschäftsbedingungen (AGB)</h1>

      <div className="prose prose-sm max-w-none text-muted">
        <h2 className="text-primary">§ 1 Geltungsbereich</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen gelten für alle Bestellungen, die über unseren Onlineshop getätigt werden. Abweichende Bedingungen des Kunden werden nicht anerkannt, es sei denn, wir stimmen ihrer Geltung ausdrücklich schriftlich zu.
        </p>

        <h2 className="text-primary">§ 2 Vertragsabschluss</h2>
        <p>
          Die Darstellung der Produkte im Onlineshop stellt kein rechtlich bindendes Angebot, sondern einen unverbindlichen Online-Katalog dar. Durch Anklicken des Buttons &quot;Kaufen&quot; geben Sie eine verbindliche Bestellung der im Warenkorb enthaltenen Waren ab. Die Bestätigung des Eingangs der Bestellung erfolgt direkt nach dem Absenden automatisch. Der Kaufvertrag kommt durch unsere Lieferung der Waren zustande.
        </p>

        <h2 className="text-primary">§ 3 Preise und Zahlung</h2>
        <p>
          Alle Preise verstehen sich als Endpreise. Gemäß § 19 UStG (Kleinunternehmerregelung) wird keine Umsatzsteuer ausgewiesen. Zuzüglich Versandkosten. Die Zahlung erfolgt über den Zahlungsdienstleister Stripe. Akzeptierte Zahlungsmethoden werden im Checkout angezeigt.
        </p>

        <h2 className="text-primary">§ 4 Versand und Lieferung</h2>
        <p>
          Die Lieferung erfolgt an die vom Kunden angegebene Lieferadresse. Angaben zu Lieferzeiten sind unverbindlich, sofern diese nicht ausdrücklich als verbindlich bezeichnet wurden. Die Gefahr des zufälligen Untergangs und der zufälligen Verschlechterung der Ware geht mit der Übergabe an den Kunden über.
        </p>

        <h2 className="text-primary">§ 5 Eigentumsvorbehalt</h2>
        <p>
          Die gelieferte Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.
        </p>

        <h2 className="text-primary">§ 6 Gewährleistung</h2>
        <p>
          Es gilt das gesetzliche Mängelhaftungsrecht. Bei individuell konfigurierten Produkten (Maße, Gravur, Farbe, Material etc.) besteht kein Anspruch auf Wandlung oder Minderung, soweit das Produkt der Konfiguration entspricht.
        </p>

        <h2 className="text-primary">§ 7 Haftungsbeschränkung</h2>
        <p>
          Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit. Im Übrigen haften wir nur bei Verletzung wesentlicher Vertragspflichten und zwar begrenzt auf den vorhersehbaren, vertragstypischen Schaden.
        </p>

        <h2 className="text-primary">§ 8 Schlussbestimmungen</h2>
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist [Ort]. Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
        </p>
      </div>
    </div>
  );
}
