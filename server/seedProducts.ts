import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is required');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

interface ProductConfig {
  name: string;
  description: string;
  metadata: {
    tier: string;
    maxWardrobes: string;
    jewelryCapsules: string;
    aiFeatures: string;
    sharing: string;
    clientManagement: string;
    exports: string;
  };
  prices: {
    monthly?: number;
    yearly?: number;
    trialDays?: number;
  };
}

const products: ProductConfig[] = [
  {
    name: 'Closana Free',
    description: 'Basic capsule wardrobe planning with 1 wardrobe and essential features',
    metadata: {
      tier: 'free',
      maxWardrobes: '1',
      jewelryCapsules: 'false',
      aiFeatures: 'basic',
      sharing: 'false',
      clientManagement: 'false',
      exports: 'false',
    },
    prices: {},
  },
  {
    name: 'Closana Premium',
    description: 'Full-featured wardrobe planning with jewelry capsules, sharing, and AI recommendations',
    metadata: {
      tier: 'premium',
      maxWardrobes: '1',
      jewelryCapsules: 'true',
      aiFeatures: 'full',
      sharing: 'true',
      clientManagement: 'false',
      exports: 'false',
    },
    prices: {
      monthly: 999,
      yearly: 7990,
      trialDays: 14,
    },
  },
  {
    name: 'Closana Family',
    description: 'Premium features with 5 wardrobes for the whole family',
    metadata: {
      tier: 'family',
      maxWardrobes: '5',
      jewelryCapsules: 'true',
      aiFeatures: 'full',
      sharing: 'true',
      clientManagement: 'false',
      exports: 'false',
    },
    prices: {
      monthly: 1999,
      yearly: 15990,
      trialDays: 14,
    },
  },
  {
    name: 'Closana Professional',
    description: 'Unlimited wardrobes with client management, exports, and priority AI for stylists and personal shoppers',
    metadata: {
      tier: 'professional',
      maxWardrobes: 'unlimited',
      jewelryCapsules: 'true',
      aiFeatures: 'priority',
      sharing: 'true',
      clientManagement: 'true',
      exports: 'true',
    },
    prices: {
      monthly: 4999,
      yearly: 39990,
      trialDays: 7,
    },
  },
];

async function seedProducts() {
  console.log('Starting product seeding...');

  for (const productConfig of products) {
    console.log(`\nCreating product: ${productConfig.name}`);

    const existingProducts = await stripe.products.search({
      query: `name:"${productConfig.name}"`,
    });

    let product: Stripe.Product;

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`  Product already exists: ${product.id}`);

      await stripe.products.update(product.id, {
        description: productConfig.description,
        metadata: productConfig.metadata,
      });
      console.log(`  Updated product metadata`);
    } else {
      product = await stripe.products.create({
        name: productConfig.name,
        description: productConfig.description,
        metadata: productConfig.metadata,
      });
      console.log(`  Created product: ${product.id}`);
    }

    if (productConfig.prices.monthly) {
      const existingMonthlyPrices = await stripe.prices.list({
        product: product.id,
        type: 'recurring',
        active: true,
      });

      const hasMonthlyPrice = existingMonthlyPrices.data.some(
        (p) => p.recurring?.interval === 'month' && p.unit_amount === productConfig.prices.monthly
      );

      if (!hasMonthlyPrice) {
        const monthlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: productConfig.prices.monthly,
          currency: 'usd',
          recurring: {
            interval: 'month',
            trial_period_days: productConfig.prices.trialDays,
          },
          metadata: {
            billing_period: 'monthly',
          },
        });
        console.log(`  Created monthly price: ${monthlyPrice.id} ($${(productConfig.prices.monthly / 100).toFixed(2)}/mo)`);
      } else {
        console.log(`  Monthly price already exists`);
      }
    }

    if (productConfig.prices.yearly) {
      const existingYearlyPrices = await stripe.prices.list({
        product: product.id,
        type: 'recurring',
        active: true,
      });

      const hasYearlyPrice = existingYearlyPrices.data.some(
        (p) => p.recurring?.interval === 'year' && p.unit_amount === productConfig.prices.yearly
      );

      if (!hasYearlyPrice) {
        const yearlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: productConfig.prices.yearly,
          currency: 'usd',
          recurring: {
            interval: 'year',
            trial_period_days: productConfig.prices.trialDays,
          },
          metadata: {
            billing_period: 'yearly',
          },
        });
        console.log(`  Created yearly price: ${yearlyPrice.id} ($${(productConfig.prices.yearly / 100).toFixed(2)}/yr)`);
      } else {
        console.log(`  Yearly price already exists`);
      }
    }
  }

  console.log('\nProduct seeding complete!');
}

seedProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
