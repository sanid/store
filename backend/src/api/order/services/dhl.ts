const DHL_BASE_URL = process.env.DHL_SANDBOX === 'true'
  ? 'https://api-sandbox.dhl.com/parcel/de/shipping/v2'
  : 'https://api-eu.dhl.com/parcel/de/shipping/v2';

const DHL_AUTH_URL = process.env.DHL_SANDBOX === 'true'
  ? 'https://api-sandbox.dhl.com/parcel/de/account/auth/ropc/v1/token'
  : 'https://api-eu.dhl.com/parcel/de/account/auth/ropc/v1/token';

interface DhlConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  billingNumber: string;
  shipper: {
    name1: string;
    addressStreet: string;
    addressHouse: string;
    postalCode: string;
    city: string;
    country: string;
    email?: string;
    phone?: string;
  };
}

function getConfig(): DhlConfig | null {
  if (
    !process.env.DHL_CLIENT_ID ||
    !process.env.DHL_CLIENT_SECRET ||
    !process.env.DHL_USERNAME ||
    !process.env.DHL_PASSWORD ||
    !process.env.DHL_BILLING_NUMBER
  ) {
    return null;
  }

  return {
    clientId: process.env.DHL_CLIENT_ID,
    clientSecret: process.env.DHL_CLIENT_SECRET,
    username: process.env.DHL_USERNAME,
    password: process.env.DHL_PASSWORD,
    billingNumber: process.env.DHL_BILLING_NUMBER,
    shipper: {
      name1: process.env.DHL_SHIPPER_NAME || '',
      addressStreet: process.env.DHL_SHIPPER_STREET || '',
      addressHouse: process.env.DHL_SHIPPER_HOUSE || '',
      postalCode: process.env.DHL_SHIPPER_POSTAL_CODE || '',
      city: process.env.DHL_SHIPPER_CITY || '',
      country: process.env.DHL_SHIPPER_COUNTRY || 'DEU',
      email: process.env.DHL_SHIPPER_EMAIL || undefined,
      phone: process.env.DHL_SHIPPER_PHONE || undefined,
    },
  };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(config: DhlConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    grant_type: 'password',
    username: config.username,
    password: config.password,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const res = await fetch(DHL_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DHL auth failed (${res.status}): ${text}`);
  }

  const data: any = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return data.access_token;
}

function countryCodeToIso3(code: string): string {
  const map: Record<string, string> = {
    DE: 'DEU', AT: 'AUT', BE: 'BEL', FR: 'FRA', NL: 'NLD',
    GB: 'GBR', US: 'USA', CA: 'CAN', CH: 'CHE', IT: 'ITA',
    ES: 'ESP', PL: 'POL', CZ: 'CZE', DK: 'DNK', SE: 'SWE',
    FI: 'FIN', NO: 'NOR', PT: 'PRT', IE: 'IRL', LU: 'LUX',
  };
  return map[code.toUpperCase()] || code.toUpperCase();
}

function isDomestic(country2: string): boolean {
  return country2.toUpperCase() === 'DE';
}

export interface DhlLabelResult {
  shipmentNumber: string;
  trackingNumber: string;
  labelB64: string;
  labelUrl?: string;
}

export async function createDhlLabel(params: {
  consignee: {
    firstName: string;
    lastName: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    email?: string;
    phone?: string;
  };
  shipmentDetails?: {
    weightKg?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  };
  product?: string;
}): Promise<DhlLabelResult> {
  const config = getConfig();
  if (!config) {
    throw new Error('DHL shipping is not configured');
  }

  const token = await getAccessToken(config);
  const countryIso3 = countryCodeToIso3(params.consignee.country);
  const domestic = isDomestic(params.consignee.country);
  const product = params.product || (domestic ? 'V01PAK' : 'V53WPAK');

  const streetParts = params.consignee.street.match(/^(.+?)\s+(\d+\s*\S*)$/);
  const streetName = streetParts ? streetParts[1] : params.consignee.street;
  const streetNumber = streetParts ? streetParts[2] : '-';

  const shipment: Record<string, unknown> = {
    product,
    billingNumber: config.billingNumber,
    refNo: `order-${Date.now()}`,
    shipper: {
      name1: config.shipper.name1,
      addressStreet: config.shipper.addressStreet,
      addressHouse: config.shipper.addressHouse,
      postalCode: config.shipper.postalCode,
      city: config.shipper.city,
      country: config.shipper.country,
      contact: {
        email: config.shipper.email || undefined,
        phone: config.shipper.phone || undefined,
      },
    },
    consignee: {
      name1: `${params.consignee.firstName} ${params.consignee.lastName}`.trim(),
      addressStreet: streetName,
      addressHouse: streetNumber,
      postalCode: params.consignee.postalCode,
      city: params.consignee.city,
      country: countryIso3,
      contact: {
        email: params.consignee.email || undefined,
        phone: params.consignee.phone || undefined,
      },
    },
    details: {
      weight: {
        uom: 'kg',
        value: params.shipmentDetails?.weightKg || 5,
      },
    },
  };

  if (
    params.shipmentDetails?.lengthCm &&
    params.shipmentDetails?.widthCm &&
    params.shipmentDetails?.heightCm
  ) {
    shipment.details = {
      ...(shipment.details as Record<string, unknown>),
      dimensions: {
        uom: 'cm',
        length: params.shipmentDetails.lengthCm,
        width: params.shipmentDetails.widthCm,
        height: params.shipmentDetails.heightCm,
      },
    };
  }

  const res = await fetch(`${DHL_BASE_URL}/orders?validate=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'dhl-api-key': config.clientId,
    },
    body: JSON.stringify({ shipments: [shipment] }),
  });

  const data: any = await res.json();

  if (!res.ok) {
    const errors = data.errors || data.items?.[0]?.errors || [];
    const msg = errors
      .map((e: any) => `${e.property || e.code}: ${e.validationMessage || e.message || JSON.stringify(e)}`)
      .join('; ');
    throw new Error(`DHL API error (${res.status}): ${msg || JSON.stringify(data)}`);
  }

  const item = data.items?.[0];
  if (!item) {
    throw new Error('DHL API returned no shipment items');
  }

  const labelData = item.label?.b64;
  if (!labelData) {
    throw new Error('DHL API returned no label data');
  }

  return {
    shipmentNumber: item.shipmentNo || item.shipmentNumber || '',
    trackingNumber: item.shipmentNo || item.trackingNumber || item.shipmentNumber || '',
    labelB64: labelData,
    labelUrl: item.label?.url || undefined,
  };
}

export function isDhlConfigured(): boolean {
  return getConfig() !== null;
}
