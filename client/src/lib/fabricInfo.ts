export interface FabricInfo {
  name: string;
  description: string;
  priceIndicator: string;
}

export const FABRIC_INFO: Record<string, FabricInfo> = {
  "polyester": {
    name: "Polyester",
    description: "Polyester is a durable, synthetic plastic-based fabric that resists wrinkles and dries quickly.",
    priceIndicator: "$"
  },
  "cotton": {
    name: "Cotton",
    description: "Cotton is a natural, breathable fabric that's soft, absorbent, and comfortable for everyday wear.",
    priceIndicator: "$"
  },
  "linen": {
    name: "Linen",
    description: "Linen is a lightweight, natural fabric made from flax that's highly breathable and perfect for warm weather.",
    priceIndicator: "$$"
  },
  "wool": {
    name: "Wool",
    description: "Wool is a natural, insulating fiber from sheep that's warm, moisture-wicking, and naturally odor-resistant.",
    priceIndicator: "$$"
  },
  "merino wool": {
    name: "Merino Wool",
    description: "Merino wool is a premium, ultra-fine wool from Merino sheep that's softer and more breathable than regular wool.",
    priceIndicator: "$$$"
  },
  "silk": {
    name: "Silk",
    description: "Silk is a luxurious, natural protein fiber produced by silkworms with a beautiful drape and lustrous sheen.",
    priceIndicator: "$$$$"
  },
  "cashmere": {
    name: "Cashmere",
    description: "Cashmere is an ultra-soft, lightweight luxury fiber from cashmere goats that provides exceptional warmth.",
    priceIndicator: "$$$$"
  },
  "denim": {
    name: "Denim",
    description: "Denim is a sturdy cotton twill fabric that's durable, versatile, and softens beautifully with wear.",
    priceIndicator: "$"
  },
  "jersey": {
    name: "Jersey",
    description: "Jersey is a soft, stretchy knit fabric that's comfortable and drapes well, commonly used in t-shirts.",
    priceIndicator: "$"
  },
  "velvet": {
    name: "Velvet",
    description: "Velvet is a soft, plush fabric with a distinctive sheen that adds luxury and elegance to any piece.",
    priceIndicator: "$$$"
  },
  "satin": {
    name: "Satin",
    description: "Satin is a smooth, glossy fabric with a lustrous surface that's elegant and drapes beautifully.",
    priceIndicator: "$$"
  },
  "chiffon": {
    name: "Chiffon",
    description: "Chiffon is a lightweight, sheer fabric with a soft drape, often used in flowing dresses and blouses.",
    priceIndicator: "$$"
  },
  "tweed": {
    name: "Tweed",
    description: "Tweed is a rough, textured wool fabric with a classic look, known for durability and warmth.",
    priceIndicator: "$$"
  },
  "flannel": {
    name: "Flannel",
    description: "Flannel is a soft, brushed fabric that's warm and cozy, perfect for cooler weather.",
    priceIndicator: "$"
  },
  "corduroy": {
    name: "Corduroy",
    description: "Corduroy is a ridged cotton fabric with distinctive wales that's durable and adds texture.",
    priceIndicator: "$"
  },
  "leather": {
    name: "Leather",
    description: "Leather is a durable, natural material made from animal hide that develops character over time.",
    priceIndicator: "$$$"
  },
  "faux leather": {
    name: "Faux Leather",
    description: "Faux leather is a synthetic alternative to leather that's more affordable and animal-friendly.",
    priceIndicator: "$"
  },
  "suede": {
    name: "Suede",
    description: "Suede is soft, napped leather with a velvety texture that's luxurious but requires careful care.",
    priceIndicator: "$$$"
  },
  "rayon": {
    name: "Rayon",
    description: "Rayon is a semi-synthetic fabric made from plant cellulose that's soft, breathable, and drapes well.",
    priceIndicator: "$"
  },
  "viscose": {
    name: "Viscose",
    description: "Viscose is a type of rayon with a silky feel that's lightweight and breathable for warm weather.",
    priceIndicator: "$"
  },
  "modal": {
    name: "Modal",
    description: "Modal is a soft, eco-friendly fabric made from beech tree pulp that's breathable and resists shrinkage.",
    priceIndicator: "$$"
  },
  "tencel": {
    name: "Tencel",
    description: "Tencel is a sustainable fabric made from eucalyptus wood pulp that's silky, breathable, and biodegradable.",
    priceIndicator: "$$"
  },
  "lyocell": {
    name: "Lyocell",
    description: "Lyocell is an eco-friendly fabric similar to Tencel, known for being soft, strong, and sustainably produced.",
    priceIndicator: "$$"
  },
  "bamboo": {
    name: "Bamboo",
    description: "Bamboo fabric is a sustainable, naturally antimicrobial material that's soft and temperature-regulating.",
    priceIndicator: "$$"
  },
  "hemp": {
    name: "Hemp",
    description: "Hemp is a durable, eco-friendly natural fiber that softens with wear and is naturally resistant to mold.",
    priceIndicator: "$$"
  },
  "nylon": {
    name: "Nylon",
    description: "Nylon is a strong, lightweight synthetic fabric that's water-resistant and quick-drying.",
    priceIndicator: "$"
  },
  "spandex": {
    name: "Spandex",
    description: "Spandex (or Lycra) is a stretchy synthetic fiber that adds flexibility and shape retention to garments.",
    priceIndicator: "$"
  },
  "elastane": {
    name: "Elastane",
    description: "Elastane is another name for spandex, providing stretch and recovery in fitted garments.",
    priceIndicator: "$"
  },
  "acrylic": {
    name: "Acrylic",
    description: "Acrylic is a synthetic wool alternative that's lightweight, warm, and easy to care for.",
    priceIndicator: "$"
  },
  "organza": {
    name: "Organza",
    description: "Organza is a sheer, crisp fabric often used in formal wear and decorative accents.",
    priceIndicator: "$$"
  },
  "tulle": {
    name: "Tulle",
    description: "Tulle is a fine, stiff netting fabric commonly used in veils, tutus, and formal gowns.",
    priceIndicator: "$"
  },
  "lace": {
    name: "Lace",
    description: "Lace is a delicate openwork fabric with intricate patterns, adding elegance and romance to garments.",
    priceIndicator: "$$"
  },
  "brocade": {
    name: "Brocade",
    description: "Brocade is a richly decorative woven fabric with raised patterns, often used in formal attire.",
    priceIndicator: "$$$"
  },
  "jacquard": {
    name: "Jacquard",
    description: "Jacquard is a textured woven fabric with complex patterns integrated into the weave itself.",
    priceIndicator: "$$"
  },
  "chambray": {
    name: "Chambray",
    description: "Chambray is a lightweight plain-weave fabric similar to denim but softer and more breathable.",
    priceIndicator: "$"
  },
  "canvas": {
    name: "Canvas",
    description: "Canvas is a heavy-duty, plain-weave fabric that's extremely durable for bags, shoes, and outerwear.",
    priceIndicator: "$"
  },
  "fleece": {
    name: "Fleece",
    description: "Fleece is a soft, warm synthetic fabric that's lightweight, quick-drying, and great for layering.",
    priceIndicator: "$"
  },
  "terry cloth": {
    name: "Terry Cloth",
    description: "Terry cloth is an absorbent fabric with looped piles, commonly used in towels and casual wear.",
    priceIndicator: "$"
  },
  "alpaca": {
    name: "Alpaca",
    description: "Alpaca is a luxurious natural fiber from alpacas that's warmer than wool and hypoallergenic.",
    priceIndicator: "$$$"
  },
  "mohair": {
    name: "Mohair",
    description: "Mohair is a lustrous fiber from Angora goats that's durable, resilient, and has a beautiful sheen.",
    priceIndicator: "$$$"
  },
  "angora": {
    name: "Angora",
    description: "Angora is an ultra-soft, fluffy fiber from Angora rabbits that's exceptionally warm and lightweight.",
    priceIndicator: "$$$$"
  },
  "silver": {
    name: "Silver",
    description: "Sterling silver is a classic, versatile precious metal that's timeless and complements any skin tone.",
    priceIndicator: "$$"
  },
  "gold": {
    name: "Gold",
    description: "Gold is a warm, luxurious precious metal that's durable and never tarnishes when pure.",
    priceIndicator: "$$$$"
  },
  "rose gold": {
    name: "Rose Gold",
    description: "Rose gold is a romantic, warm-toned gold alloy with copper that creates a pinkish hue.",
    priceIndicator: "$$$"
  },
  "mixed metals": {
    name: "Mixed Metals",
    description: "Mixing metals creates an eclectic, modern look by combining gold, silver, and rose gold pieces.",
    priceIndicator: "$$"
  },
  "platinum": {
    name: "Platinum",
    description: "Platinum is a rare, durable precious metal with a cool white sheen that's hypoallergenic.",
    priceIndicator: "$$$$"
  },
  "stainless steel": {
    name: "Stainless Steel",
    description: "Stainless steel is an affordable, durable metal that resists tarnishing and is hypoallergenic.",
    priceIndicator: "$"
  },
  "titanium": {
    name: "Titanium",
    description: "Titanium is a lightweight, extremely durable metal that's hypoallergenic and scratch-resistant.",
    priceIndicator: "$$"
  },
  "brass": {
    name: "Brass",
    description: "Brass is an affordable gold-toned alloy that develops a unique patina over time.",
    priceIndicator: "$"
  },
  "copper": {
    name: "Copper",
    description: "Copper is a warm, reddish metal known for its antimicrobial properties and unique patina development.",
    priceIndicator: "$"
  }
};

export function getFabricInfo(fabricName: string): FabricInfo | null {
  const normalized = fabricName.toLowerCase().trim();
  return FABRIC_INFO[normalized] || null;
}

export function getPriceLabel(priceIndicator: string): string {
  switch (priceIndicator) {
    case "$": return "Budget-friendly";
    case "$$": return "Mid-range";
    case "$$$": return "Premium";
    case "$$$$": return "Luxury";
    default: return "Varies";
  }
}
