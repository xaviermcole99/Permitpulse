/**
 * POST /api/webhooks/stripe
 * Handles Stripe subscription lifecycle events.
 *
 * Register this URL in your Stripe Dashboard → Webhooks.
 * Listen for: customer.subscription.created, updated, deleted
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const sub = event.data.object as Stripe.Subscription;

  // Map Stripe status to our status field
  const stripeToInternal: Record<string, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "canceled",
  };

  const status = stripeToInternal[sub.status] ?? "canceled";
  const customerId = sub.customer as string;
  const subscriptionId = sub.id;

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      await supabaseAdmin
        .from("contractors")
        .update({
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          subscription_status: status,
          trial_ends_at: sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : undefined,
        })
        .eq("stripe_customer_id", customerId);

      // If trial just ended and no payment, deactivate permits
      if (status === "canceled" || status === "past_due") {
        await supabaseAdmin
          .from("permits")
          .update({ active: false })
          .eq("contractor_id", (
            await supabaseAdmin
              .from("contractors")
              .select("id")
              .eq("stripe_customer_id", customerId)
              .single()
          ).data?.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      await supabaseAdmin
        .from("contractors")
        .update({ subscription_status: "canceled" })
        .eq("stripe_customer_id", customerId);

      // Deactivate all their permits
      const { data: contractor } = await supabaseAdmin
        .from("contractors")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (contractor) {
        await supabaseAdmin
          .from("permits")
          .update({ active: false })
          .eq("contractor_id", contractor.id);
      }
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const contractorId = session.metadata?.contractor_id;

      if (contractorId && session.customer) {
        await supabaseAdmin
          .from("contractors")
          .update({
            stripe_customer_id: session.customer as string,
            subscription_status: "trialing",
          })
          .eq("id", contractorId);
      }
      break;
    }

    default:
      // Ignore other events
      break;
  }

  return NextResponse.json({ received: true });
}
