import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

const bodySchema = z.object({
  campaignId: z.string().uuid(),
  amount: z.number().positive().max(100000),
  frequency: z.enum(["one_time", "monthly"]),
  name: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  requestTaxReceipt: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: "not_configured", message: "Online payments aren't set up yet. Please contact the mosque directly to donate for now." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: campaign, error } = await supabase
    .from("donation_campaigns")
    .select("id, mosque_id, title, currency, is_active")
    .eq("id", parsed.data.campaignId)
    .single();

  if (error || !campaign || !campaign.is_active) {
    return NextResponse.json({ error: "Campaign not found or inactive" }, { status: 404 });
  }

  const currency = (campaign.currency ?? "CAD").toLowerCase();
  const unitAmount = Math.round(parsed.data.amount * 100);
  const isMonthly = parsed.data.frequency === "monthly";

  const origin = request.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: isMonthly ? "subscription" : "payment",
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: campaign.title },
          unit_amount: unitAmount,
          ...(isMonthly ? { recurring: { interval: "month" as const } } : {}),
        },
        quantity: 1,
      },
    ],
    customer_email: parsed.data.email || undefined,
    success_url: `${origin}/donate?status=success`,
    cancel_url: `${origin}/donate?status=cancelled`,
    metadata: {
      campaignId: campaign.id,
      mosqueId: campaign.mosque_id,
      donorName: parsed.data.name ?? "",
      requestTaxReceipt: String(!!parsed.data.requestTaxReceipt),
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
