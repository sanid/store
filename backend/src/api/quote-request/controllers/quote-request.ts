import { factories } from '@strapi/strapi';
import crypto from 'crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { priceQuote, quoteCatalog, getObjectType } from '../services/quote-pricing';
import type { QuoteEffortRanges, QuoteWorkingValues } from '../services/quote-pricing';
import { generateOfferPdf } from '../services/offer-pdf';

const UID = 'api::quote-request.quote-request';
const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const SERVICE_IDS = new Set(quoteCatalog.services.map((s) => s.id));
const OBJECT_IDS = new Set(quoteCatalog.objectTypes.map((t) => t.id));
const CONDITION_IDS = new Set(quoteCatalog.conditions.map((c) => c.id));
const EXTRA_IDS = new Set(quoteCatalog.extras.map((e) => e.id));
const QUOTE_STATUSES = new Set(['new', 'in_review', 'offered', 'accepted', 'declined', 'expired']);

export default factories.createCoreController(UID, ({ strapi }: any) => ({
  /**
   * Anfrage aus dem Kalkulator anlegen. Der Preis wird hier neu gerechnet und
   * nicht vom Client uebernommen — der Client-Wert wird nur als
   * `customerPreviewGross` mitgeschrieben, damit Abweichungen sichtbar sind.
   */
  async submit(ctx: any) {
    const body = ctx.request.body ?? {};

    const email = String(body.customerEmail ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ctx.badRequest('Bitte eine gültige E-Mail-Adresse angeben.');
    }
    const name = String(body.customerName ?? '').trim();
    if (name.length < 2) {
      return ctx.badRequest('Bitte einen Namen angeben.');
    }

    const values = sanitizeWorkingValues(body.workingValues, body.aiAssessment);
    const assessment = isPlainObject(body.aiAssessment) ? body.aiAssessment : null;
    const confidence = clamp(Number(assessment?.confidence ?? 0.35), 0, 1);

    // Fotos in die Medienbibliothek, damit sie im Admin sichtbar sind.
    const photoIds = await uploadPhotos(strapi, body.photos, body.quoteCode);

    const breakdown = priceQuote(values, confidence, effortRanges(assessment));

    const entry = await strapi.documents(UID).create({
      data: {
        quoteCode: String(body.quoteCode ?? '').trim() || generateQuoteCode(),
        status: 'new',
        customerName: name,
        customerEmail: email,
        customerPhone: String(body.customerPhone ?? '').trim().slice(0, 60) || null,
        customerMessage: String(body.customerMessage ?? '').slice(0, 4000) || null,
        service: values.service,
        objectType: values.objectType,
        objectLabel:
          String(assessment?.objectLabel ?? '').slice(0, 200) ||
          getObjectType(values.objectType).label,
        quantity: values.quantity,
        dimensions: isPlainObject(body.dimensions) ? body.dimensions : null,
        photos: photoIds,
        aiSource: body.aiSource === 'ai' ? 'ai' : 'heuristic',
        aiProvider: String(body.aiProvider ?? '').slice(0, 60) || null,
        aiModel: String(body.aiModel ?? '').slice(0, 120) || null,
        aiConfidence: confidence,
        aiAssessment: assessment,
        workingValues: values,
        priceBreakdown: breakdown,
        customerPreviewGross: Number.isFinite(Number(body.customerPreviewGross))
          ? Math.round(Number(body.customerPreviewGross))
          : breakdown.gross,
        offerToken: crypto.randomBytes(24).toString('hex'),
      },
    });

    strapi.log.info(`[quote-request] neue Anfrage ${entry.quoteCode} von ${email}`);

    // Nur das Noetige zurueck — keine internen Felder an den Kunden.
    return ctx.send({
      quoteCode: entry.quoteCode,
      documentId: entry.documentId,
      gross: breakdown.gross,
    });
  },

  /** Arbeitswerte neu bewerten, nachdem jemand sie im Admin geaendert hat. */
  async recalculate(ctx: any) {
    const { documentId } = ctx.params;
    const entry = await strapi.documents(UID).findOne({ documentId });
    if (!entry) return ctx.notFound('Anfrage nicht gefunden');

    const values = sanitizeWorkingValues(
      ctx.request.body?.workingValues ?? entry.workingValues,
      entry.aiAssessment
    );
    // Ein geprueftes Angebot bekommt die enge Spanne: der Mensch hat draufgeschaut.
    const confidence = entry.status === 'new' ? Number(entry.aiConfidence ?? 0.35) : 1;
    // Nach einer Handkorrektur zaehlt die KI-Spanne nicht mehr: die Werte sind
    // dann gesetzt, nicht geschaetzt.
    const ranges = ctx.request.body?.workingValues ? undefined : effortRanges(entry.aiAssessment);
    const breakdown = priceQuote(values, confidence, ranges);

    const updated = await strapi.documents(UID).update({
      documentId,
      data: { workingValues: values, priceBreakdown: breakdown },
    });

    return ctx.send({ workingValues: values, priceBreakdown: breakdown, status: updated.status });
  },

  /** Angebotsnummer vergeben, Gueltigkeit setzen, Status auf "offered". */
  async issueOffer(ctx: any) {
    const { documentId } = ctx.params;
    const entry = await strapi.documents(UID).findOne({ documentId });
    if (!entry) return ctx.notFound('Anfrage nicht gefunden');

    if (entry.offerNumber) {
      return ctx.send({
        offerNumber: entry.offerNumber,
        offeredAt: entry.offeredAt,
        validUntil: entry.validUntil,
        alreadyIssued: true,
      });
    }

    const year = new Date().getFullYear();
    const offerNumber = await strapi
      .service('api::quote-counter.quote-counter')
      .nextOfferNumber(year);

    const offeredAt = new Date();
    const validUntil = new Date(offeredAt);
    validUntil.setDate(validUntil.getDate() + quoteCatalog.rates.offerValidDays);

    // Freigegebenes Angebot: Spanne auf das Minimum, Preis bleibt unveraendert.
    const values = sanitizeWorkingValues(entry.workingValues, entry.aiAssessment);
    const breakdown = priceQuote(values, 1);

    const updated = await strapi.documents(UID).update({
      documentId,
      data: {
        offerNumber,
        offeredAt,
        validUntil: validUntil.toISOString().slice(0, 10),
        status: 'offered',
        priceBreakdown: breakdown,
        offerToken: entry.offerToken || crypto.randomBytes(24).toString('hex'),
      },
    });

    return ctx.send({
      offerNumber: updated.offerNumber,
      offeredAt: updated.offeredAt,
      validUntil: updated.validUntil,
      offerToken: updated.offerToken,
    });
  },

  /**
   * Ops-Konsole: Arbeitswerte, Notizen und Status in einem Schritt speichern.
   * workingValues laufen ueber dieselbe Sanitisierung wie beim Recalculate.
   */
  async opsUpdate(ctx: any) {
    const { documentId } = ctx.params;
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const entry = await strapi.documents(UID).findOne({ documentId });
    if (!entry) return ctx.notFound('Anfrage nicht gefunden');

    const data: Record<string, unknown> = {};

    if (body.workingValues !== undefined) {
      data.workingValues = sanitizeWorkingValues(body.workingValues, entry.aiAssessment);
    }
    if (body.internalNotes !== undefined) {
      data.internalNotes = String(body.internalNotes ?? '').slice(0, 8000);
    }
    if (body.offerNotes !== undefined) {
      data.offerNotes = String(body.offerNotes ?? '').slice(0, 4000);
    }
    if (body.status !== undefined) {
      const status = String(body.status ?? '').trim();
      if (!QUOTE_STATUSES.has(status)) {
        return ctx.badRequest(`Unbekannter Status: ${status}`);
      }
      if (entry.status === 'offered' && status !== 'offered' && entry.offerNumber && status !== 'accepted' && status !== 'declined' && status !== 'expired') {
        return ctx.badRequest('Ein Angebot mit Nummer kann nur auf accepted, declined oder expired gesetzt werden.');
      }
      data.status = status;
    }

    if (Object.keys(data).length === 0) {
      return ctx.badRequest('Nichts zu aktualisieren.');
    }

    const updated = await strapi.documents(UID).update({ documentId, data });
    strapi.log.info(`[ops] ${ctx.state.user?.email ?? '?'} updated quote ${entry.quoteCode} (${Object.keys(data).join(', ')})`);
    return ctx.send({ data: updated });
  },

  /** Angebots-PDF. Token im Query, damit der Admin-Link direkt funktioniert. */
  async offerPdf(ctx: any) {
    const { documentId } = ctx.params;
    const token = String(ctx.query.token ?? '');

    const entry = await strapi.documents(UID).findOne({ documentId });
    if (!entry) return ctx.notFound('Anfrage nicht gefunden');

    // Timing-sichere Pruefung; ein Admin-JWT darf das Token ersetzen.
    const isAdmin = Boolean(ctx.state?.user || ctx.state?.auth?.credentials);
    if (!isAdmin && !tokenMatches(token, entry.offerToken)) {
      return ctx.unauthorized('Ungültiger Token');
    }
    if (!entry.offerNumber) {
      return ctx.badRequest('Für diese Anfrage wurde noch kein Angebot erstellt.');
    }

    const values = sanitizeWorkingValues(entry.workingValues, entry.aiAssessment);
    const breakdown = entry.priceBreakdown?.lines
      ? entry.priceBreakdown
      : priceQuote(values, 1);

    const pdf = await generateOfferPdf({
      quoteCode: entry.quoteCode,
      offerNumber: entry.offerNumber,
      offeredAt: entry.offeredAt ?? new Date(),
      validUntil: entry.validUntil,
      customerName: entry.customerName,
      customerEmail: entry.customerEmail,
      objectLabel: entry.objectLabel,
      workingValues: values,
      breakdown,
      offerNotes: entry.offerNotes,
      aiAssessment: entry.aiAssessment,
      includeAssessment: ctx.query.assessment !== 'false',
      fabricLabel: entry.workingValues?.fabricLabel ?? null,
    });

    ctx.set('Content-Type', 'application/pdf');
    ctx.set(
      'Content-Disposition',
      `inline; filename="${entry.offerNumber.replace(/[^\w.-]/g, '_')}.pdf"`
    );
    ctx.body = pdf;
  },
}));

/* ------------------------------------------------------------------ */

/** Aufwandsspanne aus der gespeicherten KI-Einschaetzung, falls vorhanden. */
function effortRanges(assessment: unknown): QuoteEffortRanges | undefined {
  if (!isPlainObject(assessment)) return undefined;
  const a = assessment as Record<string, any>;
  const pick = (v: any) =>
    isPlainObject(v) && Number.isFinite(Number(v.min)) && Number.isFinite(Number(v.max))
      ? { min: Math.max(0, Number(v.min)), max: Math.max(0, Number(v.max)) }
      : undefined;
  const fabricMeters = pick(a.fabricMetersRange);
  const laborHours = pick(a.laborHoursRange);
  if (!fabricMeters && !laborHours) return undefined;
  return { fabricMeters, laborHours };
}

function sanitizeWorkingValues(raw: unknown, assessment: unknown): QuoteWorkingValues {
  const r = isPlainObject(raw) ? raw : {};
  const a = isPlainObject(assessment) ? assessment : {};

  const objectType = enumOr(r.objectType ?? a.objectType, OBJECT_IDS, 'other');
  const service = enumOr(r.service ?? a.service, SERVICE_IDS, 'other');
  const typeDef = getObjectType(objectType);
  const quantity = clampInt(Number(r.quantity ?? a.quantity ?? 1), 1, 40);

  // Die KI-Vorschlaege stammen immer aus der Einschaetzung, nie aus dem Client —
  // sonst koennte man die Stundenanrechnung durch Umdeklarieren umgehen.
  const aiSuggestedExtras = Array.isArray(a.suggestedExtras)
    ? a.suggestedExtras.filter((x: unknown): x is string => typeof x === 'string' && EXTRA_IDS.has(x))
    : [];

  const extras = Array.isArray(r.extras)
    ? [...new Set(r.extras.filter((x: unknown): x is string => typeof x === 'string' && EXTRA_IDS.has(x)))]
    : [];

  // Grosszuegigere Grenzen als im Kalkulator: Mitarbeitende duerfen die
  // KI-Grenzen bewusst ueberschreiben, aber keine Tippfehler durchreichen.
  const fabricMeters = clamp(
    Number(r.fabricMeters ?? a.fabricMeters ?? typeDef.fabric.base * quantity),
    0,
    typeDef.fabric.max * quantity * 3
  );
  const laborHours = clamp(
    Number(r.laborHours ?? a.laborHours ?? typeDef.hours.base * quantity),
    0,
    typeDef.hours.max * quantity * 3
  );

  return {
    objectType,
    service,
    quantity,
    materialKind: r.materialKind === 'leather' || a.materialKind === 'leather' ? 'leather' : 'fabric',
    fabricId: String(r.fabricId ?? '').slice(0, 80),
    fabricLabel: String(r.fabricLabel ?? '').slice(0, 160) || undefined,
    leatherGradeId: String(r.leatherGradeId ?? quoteCatalog.leatherGrades[0].id).slice(0, 80),
    fabricMeters: round2(fabricMeters),
    laborHours: round2(laborHours),
    difficulty: clampInt(Number(r.difficulty ?? a.difficulty ?? typeDef.baseDifficulty), 1, 5),
    condition: enumOr(r.condition ?? a.condition, CONDITION_IDS, 'worn'),
    extras,
    aiSuggestedExtras,
    manualAdjustment: Number.isFinite(Number(r.manualAdjustment))
      ? Math.round(Number(r.manualAdjustment))
      : 0,
    manualAdjustmentLabel: String(r.manualAdjustmentLabel ?? '').slice(0, 120) || undefined,
  };
}

async function uploadPhotos(strapi: any, photos: unknown, quoteCode: unknown): Promise<number[]> {
  if (!Array.isArray(photos) || photos.length === 0) return [];
  const ids: number[] = [];
  const prefix = String(quoteCode ?? 'anfrage').replace(/[^\w-]/g, '') || 'anfrage';

  // Der Upload-Service von Strapi 5 liest die Datei vom Dateisystem — ein
  // Buffer allein reicht nicht. Deshalb Base64 in eine Tempdatei schreiben und
  // sie danach in jedem Fall wieder aufraeumen.
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'uf-quote-'));
  try {
    for (const [i, photo] of photos.slice(0, MAX_PHOTOS).entries()) {
      if (typeof photo !== 'string') continue;
      const match = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(photo);
      if (!match || !ALLOWED_MIME.has(match[1])) continue;

      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length === 0 || buffer.length > MAX_PHOTO_BYTES) continue;

      const ext = match[1].split('/')[1].replace('jpeg', 'jpg');
      const name = `${prefix}-${i + 1}.${ext}`;
      const filepath = path.join(tmpDir, name);

      try {
        await fs.writeFile(filepath, buffer);
        const uploaded = await strapi.plugin('upload').service('upload').upload({
          data: { fileInfo: { name, caption: `Anfrage ${prefix}`, alternativeText: name } },
          files: {
            filepath,
            originalFilename: name,
            mimetype: match[1],
            size: buffer.length,
          },
        });
        const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
        if (file?.id) ids.push(file.id);
      } catch (err) {
        strapi.log.warn(`[quote-request] Foto ${i + 1} konnte nicht gespeichert werden: ${err}`);
      }
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
  return ids;
}

function tokenMatches(given: string, expected?: string | null): boolean {
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function generateQuoteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[crypto.randomInt(alphabet.length)];
  return `UF-${code}`;
}

function isPlainObject(v: unknown): v is Record<string, any> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}
function enumOr(v: unknown, allowed: Set<string>, fallback: string): string {
  return typeof v === 'string' && allowed.has(v) ? v : fallback;
}
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
}
function clampInt(v: number, min: number, max: number): number {
  return Math.round(clamp(v, min, max));
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
