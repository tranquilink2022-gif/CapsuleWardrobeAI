export interface Sponsor {
  id: string;
  name: string;
  tagline: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  category: 'clothing' | 'accessories' | 'jewelry' | 'sustainable' | 'secondhand';
  imageUrl?: string;
}

export type SponsorPlacement = 'capsules' | 'vault' | 'shopping';

export const ETHICAL_SPONSORS: Sponsor[] = [
  {
    id: 'everlane',
    name: 'Everlane',
    tagline: 'Radical Transparency',
    description: 'Quality essentials at transparent prices. Know your factories, know your costs.',
    ctaText: 'Shop Essentials',
    ctaUrl: 'https://www.everlane.com',
    category: 'clothing',
  },
  {
    id: 'patagonia',
    name: 'Patagonia',
    tagline: 'Built to Last',
    description: 'Outdoor gear and clothing made to minimize environmental impact.',
    ctaText: 'Explore Collection',
    ctaUrl: 'https://www.patagonia.com',
    category: 'sustainable',
  },
  {
    id: 'reformation',
    name: 'Reformation',
    tagline: 'Sustainable Fashion',
    description: 'Effortless silhouettes with sustainable practices and dead-stock fabrics.',
    ctaText: 'Shop Sustainably',
    ctaUrl: 'https://www.thereformation.com',
    category: 'clothing',
  },
  {
    id: 'eileen-fisher',
    name: 'Eileen Fisher',
    tagline: 'Timeless Design',
    description: 'Simple, sustainable pieces designed to last beyond trends.',
    ctaText: 'Discover More',
    ctaUrl: 'https://www.eileenfisher.com',
    category: 'clothing',
  },
  {
    id: 'thredup',
    name: 'ThredUp',
    tagline: 'Secondhand First',
    description: 'The world\'s largest online thrift store. Give clothes a second life.',
    ctaText: 'Shop Thrift',
    ctaUrl: 'https://www.thredup.com',
    category: 'secondhand',
  },
  {
    id: 'mejuri',
    name: 'Mejuri',
    tagline: 'Fine Jewelry, Fair Prices',
    description: 'Handcrafted fine jewelry designed for everyday wear.',
    ctaText: 'Shop Jewelry',
    ctaUrl: 'https://www.mejuri.com',
    category: 'jewelry',
  },
  {
    id: 'allbirds',
    name: 'Allbirds',
    tagline: 'Comfort Meets Sustainability',
    description: 'Shoes and apparel made from natural materials like merino wool and eucalyptus.',
    ctaText: 'Step Into Comfort',
    ctaUrl: 'https://www.allbirds.com',
    category: 'accessories',
  },
  {
    id: 'pact',
    name: 'Pact',
    tagline: 'Organic Basics',
    description: 'Everyday essentials made with organic cotton and fair trade practices.',
    ctaText: 'Shop Organic',
    ctaUrl: 'https://www.wearpact.com',
    category: 'clothing',
  },
];

export function getSponsorForPlacement(placement: SponsorPlacement, index: number = 0): Sponsor {
  const sponsors = ETHICAL_SPONSORS;
  return sponsors[index % sponsors.length];
}

export function getRandomSponsor(): Sponsor {
  const randomIndex = Math.floor(Math.random() * ETHICAL_SPONSORS.length);
  return ETHICAL_SPONSORS[randomIndex];
}
