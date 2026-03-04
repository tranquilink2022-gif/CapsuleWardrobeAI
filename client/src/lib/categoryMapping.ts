import type { ItemCategory } from "@shared/schema";

const KEYWORD_TO_CATEGORY: Record<string, ItemCategory> = {
  shirt: "Tops",
  blouse: "Tops",
  tee: "Tops",
  "t-shirt": "Tops",
  tshirt: "Tops",
  polo: "Tops",
  tank: "Tops",
  camisole: "Tops",
  crop: "Tops",
  tunic: "Tops",
  henley: "Tops",

  pants: "Bottoms",
  jeans: "Bottoms",
  shorts: "Bottoms",
  trousers: "Bottoms",
  skirt: "Bottoms",
  leggings: "Bottoms",
  chinos: "Bottoms",
  joggers: "Bottoms",
  culottes: "Bottoms",
  capris: "Bottoms",

  jacket: "Outerwear",
  coat: "Outerwear",
  parka: "Outerwear",
  blazer: "Outerwear",
  windbreaker: "Outerwear",
  raincoat: "Outerwear",
  overcoat: "Outerwear",
  trench: "Outerwear",
  anorak: "Outerwear",

  dress: "Dresses",
  gown: "Dresses",
  romper: "Dresses",
  jumpsuit: "Dresses",
  maxi: "Dresses",

  cardigan: "Layering Pieces",
  sweater: "Layering Pieces",
  hoodie: "Layering Pieces",
  vest: "Layering Pieces",
  pullover: "Layering Pieces",
  sweatshirt: "Layering Pieces",
  poncho: "Layering Pieces",
  shawl: "Layering Pieces",
  wrap: "Layering Pieces",
  fleece: "Layering Pieces",

  sneakers: "Shoes",
  boots: "Shoes",
  heels: "Shoes",
  sandals: "Shoes",
  loafers: "Shoes",
  flats: "Shoes",
  oxfords: "Shoes",
  mules: "Shoes",
  pumps: "Shoes",
  slippers: "Shoes",
  espadrilles: "Shoes",
  clogs: "Shoes",

  belt: "Accessories",
  scarf: "Accessories",
  hat: "Accessories",
  bag: "Accessories",
  purse: "Accessories",
  sunglasses: "Accessories",
  gloves: "Accessories",
  tie: "Accessories",
  clutch: "Accessories",
  tote: "Accessories",
  backpack: "Accessories",
  beanie: "Accessories",
  cap: "Accessories",
  wallet: "Accessories",

  ring: "Rings",
  signet: "Rings",

  necklace: "Necklaces",
  pendant: "Necklaces",
  chain: "Necklaces",
  choker: "Necklaces",
  locket: "Necklaces",

  bracelet: "Bracelets",
  bangle: "Bracelets",
  cuff: "Bracelets",

  earring: "Earrings",
  earrings: "Earrings",
  studs: "Earrings",
  hoops: "Earrings",

  watch: "Watches",
  timepiece: "Watches",
};

export function suggestCategory(
  itemName: string,
  availableCategories: ItemCategory[],
): ItemCategory | null {
  if (!itemName || !availableCategories.length) return null;

  const lowerName = itemName.toLowerCase();

  for (const [keyword, category] of Object.entries(KEYWORD_TO_CATEGORY)) {
    if (!availableCategories.includes(category)) continue;

    const regex = new RegExp(`\\b${keyword}s?\\b`, "i");
    if (regex.test(lowerName)) {
      return category;
    }
  }

  return null;
}
