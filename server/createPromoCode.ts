import Stripe from 'stripe';
import { getStripeSecretKey } from './stripeClient';

async function createPromoCode() {
  console.log('Creating promo code for beta testers...');
  
  const secretKey = await getStripeSecretKey();
  // Use an older API version that has the standard coupon parameter
  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-06-20' as any,
  });

  // First create a coupon for 100% off
  const coupon = await stripe.coupons.create({
    percent_off: 100,
    duration: 'forever',
    name: 'Beta Tester - Free Access',
    metadata: {
      purpose: 'beta_testing',
    },
  });
  console.log(`Created coupon: ${coupon.id}`);

  // Then create the promotion code
  const promoCode = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: 'betatest26',
    metadata: {
      purpose: 'beta_testing',
    },
  });
  console.log(`Created promo code: ${promoCode.code} (ID: ${promoCode.id})`);

  console.log('\nPromo code "betatest26" is now active!');
  console.log('Beta testers can use this code at checkout for 100% off any paid plan.');
}

createPromoCode()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to create promo code:', error.message);
    process.exit(1);
  });
