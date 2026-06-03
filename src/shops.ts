import { BarbeariaConfig } from './types';
import { DEFAULT_CONFIG } from './data';

export interface ShopDefinition {
  slug: string;
  name: string;
  tagline: string;
  config: BarbeariaConfig;
}

export const SHOPS: ShopDefinition[] = [
  {
    slug: 'navalha-estilo',
    name: 'Navalha & Estilo',
    tagline: 'Cortes modernos e barba na toalha quente',
    config: DEFAULT_CONFIG
  },
  {
    slug: 'barba-forte',
    name: 'Barba Forte',
    tagline: 'Especialistas em degradê e design de barba',
    config: {
      name: 'Barba Forte',
      phone: '(11) 98888-7777',
      pixKey: 'pix@barbaforte.com.br',
      cancelBufferHours: 3,
      openingTime: '10:00',
      closingTime: '20:00'
    }
  },
  {
    slug: 'corte-classico',
    name: 'Corte Clássico',
    tagline: 'Tradição e elegância masculina',
    config: {
      name: 'Corte Clássico',
      phone: '(11) 97777-6666',
      pixKey: 'pix@corteclassico.com.br',
      cancelBufferHours: 2,
      openingTime: '08:00',
      closingTime: '18:00'
    }
  }
];

export function getShopBySlug(slug: string | undefined): ShopDefinition | undefined {
  if (!slug) return undefined;
  return SHOPS.find(s => s.slug === slug);
}

export function getAssistantUrl(slug: string): string {
  return `/b/${slug}`;
}

export function getAdminUrl(slug: string): string {
  return `/admin/${slug}`;
}
