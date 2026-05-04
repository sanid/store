export interface CustomizationField {
  id: string;
  type: "text" | "number" | "color" | "select" | "image" | "textarea";
  label: string;
  required?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  maxLength?: number;
  step?: number;
  options?: string[];
  placeholder?: string;
  priceModifier?: Record<string, number>;
}

export interface CustomizationSchema {
  fields: CustomizationField[];
}

export interface StrapiMediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  url: string;
}

export interface StrapiMedia {
  id: number;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number;
  height: number;
  formats: {
    thumbnail?: StrapiMediaFormat;
    small?: StrapiMediaFormat;
    medium?: StrapiMediaFormat;
    large?: StrapiMediaFormat;
  };
  url: string;
}

export interface Product {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  price: number;
  image: StrapiMedia | null;
  images: StrapiMedia[];
  sku: string | null;
  inventory: number;
  status: "draft" | "published" | "discontinued";
  featured: boolean;
  customizationSchema: CustomizationSchema | null;
  categories: Category[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Category {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description: string | null;
  image: StrapiMedia | null;
  products?: Product[];
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  documentId: string;
  name: string;
  basePrice: number;
  totalPrice: number;
  quantity: number;
  image: string;
  customization: Record<string, unknown>;
  customizationPriceAdjustment: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  basePrice: number;
  totalPrice: number;
  quantity: number;
  customization: Record<string, unknown>;
}
