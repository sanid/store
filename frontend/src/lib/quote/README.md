# KI-Schnellkalkulator

Foto-basierter Richtpreis-Rechner für Polster- und Sonderanfertigungen,
erreichbar unter `/kalkulator`. Ergänzt den Vorhang-Konfigurator um Aufträge,
die sich nicht über feste Optionen abbilden lassen.

## Ablauf

1. Kunde wählt Leistung, Objekttyp, Anzahl, Maße, lädt Fotos hoch und beschreibt
   das Stück.
2. `POST /api/quote` schickt das an den konfigurierten KI-Anbieter und bekommt
   eine **Werkstatt-Einschätzung** zurück — Klassifikation, Stoffbedarf in lfm,
   Arbeitsstunden, Schwierigkeit 1–5, Zustand, Risiken, Sicherheit.
3. Der Server rechnet daraus deterministisch einen Preis und liefert Ergebnis +
   Startauswahl.
4. Der Kunde wechselt im Konfigurator Material, Zusatzarbeiten, Zustand und
   Anzahl; der Preis wird im Browser mit **derselben** Funktion neu berechnet.

## Zwei Regeln, die das Ganze tragen

**Die KI nennt nie einen Preis.** Sie schätzt nur Aufwand und Material. Jede
Zahl, die der Kunde in Euro sieht, kommt aus `pricing.ts` — einer reinen
Funktion, die Server und Client teilen. Ein Modellwechsel kann die Preisformel
also nicht verändern.

**Jede KI-Zahl wird geklemmt.** `estimate.ts` begrenzt Stoffbedarf und
Arbeitszeit auf die `min`/`max`-Bereiche aus `catalog.ts`. Ein Modell, das für
einen Stuhl 400 lfm behauptet, erzeugt keinen Fantasiepreis, sondern den
teuersten plausiblen Stuhl — und die Begrenzung erscheint für den Kunden
sichtbar unter „Annahmen".

## Anbieter konfigurieren

Der Anbieter ist austauschbar (`src/lib/ai/`). Alle drei bekommen dieselbe
Anfrage und liefern dasselbe JSON-Schema; die Aufrufseite kennt keinen
Anbieter-spezifischen Code.

| Variable | Bedeutung |
|---|---|
| `AI_PROVIDER` | `anthropic` \| `openai` \| `google`. Ohne Angabe: erster Anbieter mit hinterlegtem Key, Reihenfolge Claude → OpenAI → Gemini. |
| `AI_MODEL` | Überschreibt das Standardmodell. Defaults: `claude-sonnet-5`, `gpt-4o`, `gemini-2.5-flash`. |
| `AI_EFFORT` | Nur Claude: `low`…`max`, Default `high`. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_API_KEY` | Zugangsdaten. |
| `QUOTE_RATE_LIMIT` / `QUOTE_RATE_WINDOW_MS` | Rate Limit pro IP, Default 8 / 10 min. |
| `NEXT_PUBLIC_LABOR_RATE_CENTS` | Werkstatt-Stundensatz, Default 6800 (68,00 €). |

**Ohne Key läuft der Kalkulator weiter.** Er nutzt dann `heuristicEstimate()` —
die Erfahrungswerte aus `catalog.ts` — setzt die Sicherheit auf 35 % und weist
den Kunden im UI darauf hin. Dasselbe passiert, wenn ein konfigurierter Anbieter
ausfällt: die Anfrage schlägt nicht fehl, sie wird ungenauer.

### Modellwahl

Standard ist **Claude Sonnet 5**, gemessen an drei Fotos eines Teak-Sessels
gegen Opus 5:

| Modell | Material | Arbeitszeit | Sicherheit | Kosten/Anfrage | Zeit |
|---|---|---|---|---|---|
| Opus 5 | 3,2 lfm | 6 Std. | 0,68 | $0,064 | ~18 s |
| **Sonnet 5** | **3,2 lfm** | **6 Std.** | **0,75** | **$0,026** | **~14 s** |
| Haiku 4.5 | 5,5 lfm | 10 Std. | 0,35 | $0,008 | ~23 s |

Opus und Sonnet liefern dieselben preisbestimmenden Werte; Sonnet kostet ein
Drittel. Haiku ist ungeeignet — es schätzte denselben Sessel über den
Referenzwert für einen *vollgepolsterten* Sessel und hätte fast doppelt so
teuer angeboten. Wer eine Modellumstellung prüfen will, lässt dieselben Fotos
zweimal durchlaufen und vergleicht `fabricMeters` und `laborHours`; alles
andere ist Geschmack, diese beiden bestimmen den Preis.

## Preise und Aufwände anpassen

Alles Kaufmännische steht in `catalog.ts`:

- `OBJECT_TYPES` — lfm und Stunden je Objekttyp, plus die Plausibilitätsgrenzen
- `SERVICES` — wie stark eine Reparatur gegenüber einem Neubezug abweicht
- `EXTRAS` — Zusatzarbeiten mit Stunden-, Fix- und Materialaufschlag
- `LEATHER_GRADES` — Lederqualitäten in €/m²
- `LABOR_RATE_PER_HOUR`, `SETUP_FEE`, `CONSUMABLES_RATE`, `DIFFICULTY_FACTOR`

Stoffe kommen aus `lib/curtains.ts` (`FABRICS`, gefiltert auf
`use: ["upholstery"]`), damit Kalkulator und Vorhang-Konfigurator nie
unterschiedliche Stoffpreise anzeigen.

Der System-Prompt in `prompt.ts` liest `catalog.ts` zur Laufzeit — neue
Objekttypen oder Extras stehen dem Modell automatisch zur Verfügung, ohne dass
der Prompt angefasst werden muss.

## Noch offen

- Die Anfrage-Codes (`UF-XXXXXX`) werden erzeugt, aber nirgends gespeichert. Für
  echtes Wiederaufrufen braucht es eine Strapi-Collection.
- Das Rate Limit ist In-Memory und damit pro Instanz. Bei mehreren Instanzen
  gehört das nach Redis/KV.
- „Angebot anfragen" öffnet ein vorausgefülltes Mailto. Ein echtes
  Anfrage-Formular mit Foto-Upload wäre der nächste Schritt.
