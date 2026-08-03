import Stripe from "stripe";

let client: Stripe | null | undefined;

/**
 * Lazily constructs the Stripe client on first use rather than at module
 * load, mirroring sendSmartNotification.ts's VAPID pattern: importing this
 * module during Next.js's build-time route collection must never throw just
 * because STRIPE_SECRET_KEY isn't set in this environment yet. A missing key
 * degrades to "donations aren't live yet" (getStripeClient() returns null),
 * not a broken production build.
 */
export function getStripeClient(): Stripe | null {
  if (client !== undefined) return client;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    client = null;
    return client;
  }

  client = new Stripe(secretKey);
  return client;
}
