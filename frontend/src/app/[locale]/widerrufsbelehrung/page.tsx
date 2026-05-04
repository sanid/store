import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Widerrufsbelehrung",
  description: "Widerrufsrecht für Verbraucher bei Fernabsatzverträgen",
};

export default function WiderrufsbelehrungPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-primary">Widerrufsbelehrung</h1>

      <div className="prose prose-sm max-w-none text-muted">
        <p className="rounded-lg bg-surface p-3 text-xs not-prose">
          <strong>Hinweis:</strong> Alle Preise verstehen sich als Endpreise gemäß § 19 UStG (Kleinunternehmerregelung). Es wird keine Umsatzsteuer ausgewiesen.
        </p>

        <h2 className="text-primary">Widerrufsrecht</h2>
        <p>
          Sie haben das Recht, diesen Vertrag innerhalb von 14 Tagen ohne Angabe von Gründen zu widerrufen.
        </p>
        <p>
          Die Widerrufsfrist beträgt 14 Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die letzte Ware in Besitz genommen haben.
        </p>
        <p>
          Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren:
        </p>
        <p>
          [Firmenname]
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ Ort]
          <br />
          E-Mail: [info@customstore.com]
        </p>

        <h2 className="text-primary">Widerrufsfolgen</h2>
        <p>
          Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.
        </p>
        <p>
          Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere Zeitpunkt ist.
        </p>

        <h2 className="text-primary">Rücksendekosten</h2>
        <p>
          Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an uns zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden. Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.
        </p>

        <h2 className="text-primary">Ausschluss des Widerrufs</h2>
        <p>
          Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist oder die eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind.
        </p>
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 not-prose">
          <strong>Hinweis:</strong> Da unsere Produkte individuell nach Ihren Spezifikationen (Maße, Gravur, Farbe, Material etc.) angefertigt werden, ist das Widerrufsrecht gemäß § 312g Abs. 2 Nr. 1 BGB grundsätzlich ausgeschlossen. Sie können den Vertrag daher nur widerrufen, wenn Sie die Ware nicht individuell konfiguriert haben.
        </p>
      </div>
    </div>
  );
}
