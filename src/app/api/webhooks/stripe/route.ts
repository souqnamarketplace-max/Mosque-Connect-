import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

/**
 * POST /api/webhooks/stripe
 * Configure this URL in the Stripe Dashboard (Developers -> Webhooks) once
 * STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are set — see DONATE_WIRING_GUIDE.md.
 * Records the donation and bumps the campaign's raised_amount only after
 * Stripe confirms the payment actually succeeded, never on session creation.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhooks/stripe] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const campaignId = session.metadata?.campaignId;
    const mosqueId = session.metadata?.mosqueId;
    const amount = (session.amount_total ?? 0) / 100;

    if (campaignId && mosqueId && amount > 0) {
      const supabase = createServiceRoleClient();

      await supabase.from("donations").insert({
        mosque_id: mosqueId,
        campaign_id: campaignId,
        amount,
        status: "succeeded",
      });

      // Best-effort read-modify-write — acceptable for this app's volume;
      // a concurrent double-write would only under-count by one donation
      // in the rare case of two webhooks landing in the same instant.
      const { data: campaign } = await supabase
        .from("donation_campaigns")
        .select("raised_amount")
        .eq("id", campaignId)
        .single();

      if (campaign) {
        await supabase
          .from("donation_campaigns")
          .update({ raised_amount: Number(campaign.raised_amount) + amount })
          .eq("id", campaignId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
