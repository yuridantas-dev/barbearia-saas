const DEFAULT_SLUG = 'navalha-estilo';

let activeShopSlug = DEFAULT_SLUG;

export function setActiveShopSlug(slug: string): void {
  activeShopSlug = slug;
}

export function getActiveShopSlug(): string {
  return activeShopSlug;
}

export function shopStorageKey(baseKey: string, slug?: string): string {
  return `${baseKey}__${slug ?? activeShopSlug}`;
}

export function readShopJson<T>(baseKey: string, slug?: string): T | null {
  try {
    const raw = localStorage.getItem(shopStorageKey(baseKey, slug));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeShopJson(baseKey: string, value: unknown, slug?: string): void {
  localStorage.setItem(shopStorageKey(baseKey, slug), JSON.stringify(value));
}

export function removeShopKey(baseKey: string, slug?: string): void {
  localStorage.removeItem(shopStorageKey(baseKey, slug));
}

export { DEFAULT_SLUG };
