/**
 * POST /api/permits  — Onboarding: create contractor + permits + Stripe checkout
 * GET  /api/permits  — Dashboard: fetch permits for a given email
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

// ── POST: onboard a new contractor ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { email, phone, permits, frequency } = await req.json();

    if (!email || !permits?.length) {
      return NextResponse.json({ error: "Email and at least one permit are required." }, { status: 400 });
    }

    // Upsert contractor
    const { data: contractor, error: cErr } = await supabaseAdmin
      .from("contractors")
      .upsert({ email, phone: phone || null }, { onConflict: "email" })
      .select()
      .single();

    if (cErr || !contractor) {
      console.error(cErr);
      return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
    }

    // Map frequency string to Postgres interval
    const intervalMap: Record<string, string> = {
      "1h": "1 hour",
      "2h": "2 hours",
      "4h": "4 hours",
      "daily": "24 hours",
    };

    await supabaseAdmin
      .from("contractors")
      .update({ check_frequency: intervalMap[frequency] ?? "2 hours" })
      .eq("id", contractor.id);

    // Insert permits (skip duplicates)
    const permitRows = permits.map((p: { number: string; city: string; url: string }) => ({
      contractor_id: contractor.id,
      permit_number: p.number,
      city: p.city,
      portal_url: p.url,
      scraper_config: { template: "accela_generic" }, // default; overridden by cron if needed
    }));

    await supabaseAdmin.from("permits").upsert(permitRows, { onConflict: "contractor_id,permit_number,city" });

    // Create Stripe checkout session (7-day trial)
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [{ price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!, quantity: 1 }],
      mode: "subscription",
      subscription_data: { trial_period_days: 7 },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      metadata: { contractor_id: contractor.id },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("[POST /api/permits]", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}

// ── GET: fetch permits for dashboard ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }

  const { data: contractor } = await supabaseAdmin
    .from("contractors")
    .select("id")
    .eq("email", email)
    .single();

  if (!contractor) {
    return NextResponse.json({ permits: [] });
  }

  const { data: permits } = await supabaseAdmin
    .from("permits")
    .select(`*, events:status_events(new_status, old_status, created_at)`)
    .eq("contractor_id", contractor.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return NextResponse.json({ permits: permits ?? [] });
}
