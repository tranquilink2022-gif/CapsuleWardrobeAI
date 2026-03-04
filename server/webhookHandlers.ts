import { getStripeSync } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }

  static async handleSubscriptionChange(subscriptionId: string): Promise<void> {
    try {
      const sync = await getStripeSync();
      const subscription = await sync.getSubscription(subscriptionId);
      
      if (!subscription) return;

      const customerId = subscription.customer;
      const user = await storage.getUserByStripeCustomerId(customerId);
      
      if (!user) return;

      const tierMetadata = subscription.metadata?.tier || 'free';
      const tier = ['premium', 'family', 'professional'].includes(tierMetadata) ? tierMetadata : 'free';

      await storage.updateUserSubscription(user.id, {
        stripeSubscriptionId: subscriptionId,
        subscriptionTier: subscription.status === 'active' || subscription.status === 'trialing' ? tier : 'free',
        subscriptionStatus: subscription.status,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      });
    } catch (error) {
      console.error(`Failed to handle subscription change for ${subscriptionId}:`, error);
      throw error;
    }
  }
}
