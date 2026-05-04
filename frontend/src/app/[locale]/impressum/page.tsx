import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum – gesetzliche Pflichtangaben gemäß § 5 TMG",
};

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-primary">Impressum</h1>

      <div className="prose prose-sm max-w-none text-muted">
        <h2 className="text-primary">Angaben gemäß § 5 TMG</h2>
        <p>
          [Vorname Nachname / Firmenname]
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ Ort]
          <br />
          Deutschland
        </p>

        <h2 className="text-primary">Kontakt</h2>
        <p>
          Telefon: [+49 ...]
          <br />
          E-Mail: [info@customstore.com]
        </p>

        <h2 className="text-primary">Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:
          <br />
          [DE XXX XXX XXX]
        </p>

        <h2 className="text-primary">Hinweis nach § 19 UStG</h2>
        <p>
          Umsatzsteuerbefreit nach § 19 UStG (Kleinunternehmerregelung). Es wird gemäß § 19 Abs. 1 UStG keine Umsatzsteuer in der Rechnung ausgewiesen.
        </p>

        <h2 className="text-primary">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          [Vorname Nachname]
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ Ort]
        </p>

        <h2 className="text-primary">Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover">
            https://ec.europa.eu/consumers/odr/
          </a>
        </p>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>

        <h2 className="text-primary">Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
        </p>

        <h2 className="text-primary">Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
        </p>

        <h2 className="text-primary">Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
        </p>
      </div>
    </div>
  );
}
