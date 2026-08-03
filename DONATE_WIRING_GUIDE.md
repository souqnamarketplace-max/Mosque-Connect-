# Donations — Stripe Wiring Guide
# The code is fully built and functional. Everything below is what YOU need
# to do to actually go live — no more code changes required for this.

## What's already built
src/
  lib/stripe.ts                          ← Lazy Stripe client (mirrors the VAPID push pattern:
                                            missing key = "not configured", never a broken build)
  app/api/donate/checkout/route.ts       ← Creates a Stripe Checkout Session for one-time or
                                            monthly donations against an active campaign
  app/api/webhooks/stripe/route.ts       ← Verifies the Stripe webhook signature, records the
                                            donation, and bumps donation_campaigns.raised_amount
                                            — only ever on confirmed payment, never on session creation
  app/donate/page.tsx                    ← Full checkout UI (amount, frequency, name/email,
                                            tax receipt opt-in), redirects to Stripe Checkout

If STRIPE_SECRET_KEY isn't set, the checkout button still works but shows the
honest "online payment is being set up" message instead of erroring — safe
to deploy before you've finished the steps below.

---

## Go-live checklist

### Step 1: Create a Stripe account
https://dashboard.stripe.com/register — use the mosque/organization's real
business details (Stripe requires this to pay out to a real bank account).

### Step 2: Get your API keys
Stripe Dashboard → Developers → API keys.
  - Use the **test** secret key first to verify the flow end-to-end with
    Stripe's test card numbers, then switch to the **live** secret key.

### Step 3: Add to Vercel environment variables
  STRIPE_SECRET_KEY       = sk_test_... (or sk_live_... when ready)

### Step 4: Set up the webhook
Stripe Dashboard → Developers → Webhooks → Add endpoint.
  - Endpoint URL: https://<your-domain>/api/webhooks/stripe
  - Events to send: checkout.session.completed
  - Copy the resulting "Signing secret" (whsec_...)

### Step 5: Add the webhook secret to Vercel
  STRIPE_WEBHOOK_SECRET   = whsec_...

### Step 6: Test with Stripe's test card
  Card number: 4242 4242 4242 4242, any future expiry, any CVC.
  Confirm: the Checkout Session completes, the webhook fires (Stripe
  Dashboard → Webhooks → your endpoint → shows a 200), a row appears in the
  `donations` table with status 'succeeded', and the campaign's
  raised_amount increases.

### Step 7: Go live
  Swap the test secret key for the live one in Vercel once you're confident
  in the flow, and re-run Step 4 for a live-mode webhook endpoint (Stripe
  keeps test and live webhooks separate).

---

## What this does NOT include (not asked for, not built)
  - Recurring/subscription cancellation UI for donors (Stripe's customer
    portal can be enabled in the Dashboard for this without new code:
    Settings → Billing → Customer portal).
  - Tax receipt generation/emailing — `requestTaxReceipt` is captured on the
    Stripe Checkout Session's metadata (and readable in the Stripe
    Dashboard for each payment) but nothing automatically emails a receipt
    PDF. Add that as its own feature if/when needed.
  - Refund handling.
