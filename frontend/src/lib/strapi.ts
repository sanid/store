import type { Product, Category } from "./types";

const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

function getStrapiMediaUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}

function getStrapiImageUrl(
  media: { url: string; formats?: Record<string, { url: string }> } | null,
  format: "thumbnail" | "small" | "medium" | "large" | null = null
): string | null {
  if (!media) return null;
  if (format && media.formats?.[format]) {
    return getStrapiMediaUrl(media.formats[format].url);
  }
  return getStrapiMediaUrl(media.url);
}

async function fetchAPI<T>(
  path: string,
  options: RequestInit = {},
  revalidate?: number
): Promise<T> {
  const url = `${API_URL}/api${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
      next: revalidate !== undefined ? { revalidate } : undefined,
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText} for ${url}`);
    }

    const json = await res.json();
    return json;
  } catch (error) {
    console.warn(`Strapi API unavailable at ${url}:`, error);
    return { data: [], meta: {} } as T;
  }
}

interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

async function getProducts(
  params: Record<string, string> = {}
): Promise<Product[]> {
  const searchParams = new URLSearchParams({
    "populate[image]": "true",
    "populate[categories]": "true",
    ...params,
  });

  const response = await fetchAPI<StrapiResponse<Product[]>>(
    `/products?${searchParams.toString()}`,
    {},
    60
  );
  return response.data;
}

async function getProductBySlug(slug: string): Promise<Product | null> {
  const searchParams = new URLSearchParams({
    "filters[slug][$eq]": slug,
    "populate[image]": "true",
    "populate[images]": "true",
    "populate[categories]": "true",
  });

  const response = await fetchAPI<StrapiResponse<Product[]>>(
    `/products?${searchParams.toString()}`,
    {},
    60
  );
  return response.data[0] || null;
}

async function getFeaturedProducts(): Promise<Product[]> {
  return getProducts({
    "filters[featured][$eq]": "true",
  });
}

async function getCategories(): Promise<Category[]> {
  const response = await fetchAPI<StrapiResponse<Category[]>>(
    "/categories?populate[image]=true",
    {},
    300
  );
  return response.data;
}

export {
  API_URL,
  getStrapiMediaUrl,
  getStrapiImageUrl,
  fetchAPI,
  getProducts,
  getProductBySlug,
  getFeaturedProducts,
  getCategories,
};
