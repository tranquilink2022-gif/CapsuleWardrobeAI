import type { CapsuleCategory } from "@shared/schema";

export interface CapsuleTemplate {
  id: string;
  name: string;
  description: string;
  season: string;
  useCase: string;
  capsuleCategory: CapsuleCategory;
  totalSlots: number;
  categorySlots: Record<string, number>;
}

export const CAPSULE_TEMPLATES: CapsuleTemplate[] = [
  {
    id: "summer-essentials",
    name: "Summer Essentials",
    description: "A light, versatile capsule for warm weather with breezy tops, shorts, and sun-ready accessories",
    season: "Summer",
    useCase: "Everyday",
    capsuleCategory: "Clothing",
    totalSlots: 10,
    categorySlots: {
      Tops: 3,
      Bottoms: 2,
      Dresses: 1,
      Outerwear: 1,
      Shoes: 2,
      Accessories: 1,
    },
  },
  {
    id: "winter-wardrobe",
    name: "Winter Wardrobe",
    description: "A cozy, layered capsule built for cold weather with warm outerwear and versatile layering pieces",
    season: "Winter",
    useCase: "Everyday",
    capsuleCategory: "Clothing",
    totalSlots: 15,
    categorySlots: {
      Tops: 4,
      Bottoms: 3,
      "Layering Pieces": 3,
      Outerwear: 2,
      Shoes: 2,
      Accessories: 1,
    },
  },
  {
    id: "work-week",
    name: "Work Week",
    description: "A polished capsule for the office with professional tops, bottoms, and smart shoes",
    season: "Spring",
    useCase: "Work",
    capsuleCategory: "Clothing",
    totalSlots: 15,
    categorySlots: {
      Tops: 5,
      Bottoms: 3,
      "Layering Pieces": 2,
      Outerwear: 1,
      Shoes: 3,
      Accessories: 1,
    },
  },
  {
    id: "weekend-casual",
    name: "Weekend Casual",
    description: "A relaxed capsule for off-duty days with comfortable basics and easy-going layers",
    season: "Fall",
    useCase: "Everyday",
    capsuleCategory: "Clothing",
    totalSlots: 9,
    categorySlots: {
      Tops: 3,
      Bottoms: 2,
      "Layering Pieces": 1,
      Outerwear: 1,
      Shoes: 2,
    },
  },
  {
    id: "travel-light",
    name: "Travel Light",
    description: "A compact, mix-and-match capsule designed for packing light without sacrificing style",
    season: "Spring",
    useCase: "Travel",
    capsuleCategory: "Clothing",
    totalSlots: 10,
    categorySlots: {
      Tops: 3,
      Bottoms: 2,
      "Layering Pieces": 1,
      Outerwear: 1,
      Shoes: 2,
      Accessories: 1,
    },
  },
];
