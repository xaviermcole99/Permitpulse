/**
 * GET /api/cron
 * Scheduled job — checks all active permits for status changes.
 *
 * SETUP OPTIONS:
 *
 * 1. Vercel Cron (recommended if deploying to Vercel):
 *    Add to vercel.json:
 *    {
 *      "crons": [{ "path": "/api/cron", "schedule": "0 * /2 * * *" }]
 *    }
 *    Vercel sends the request automatically.
 *
 * 2. Railway / Render worker:
 *    Deploy a worker that runs `curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.com/api/cron`
 *    on a cron schedule.
 *
 * 3. GitHub Actions (free):
 *    Use a scheduled workflow that hits this endpoint every 2 hours.
 *
 * The Authorization header must match the CRON_SECRET env var to prevent unauthorized calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { batchCheckPermits } from "@/lib/scraper";
import { sendAlert } from "@/lib/alerts";

export const maxDuration = 300; // 5 min max (Vercel Pro)

export async function GET(req: NextRequest) {
  // Auth check
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[cron] Starting permit checks...");

  // Fetch all active permits for contractors with active/trialing subscriptions
  const { data: permits, error } = await supabaseAdmin
    .from("permits")
    .select("id, permit_number, portal_url, scraper_config, current_status, contractor:contractors(id, email, phone, subscription_status)")
    .eq("active", true)
    .in("contractor.subscription_status", ["active", "trialing"]);

  if (error || !permits) {
    console.error("[cron] Failed to fetch permits:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  console.log(`[cron] Checking ${permits.length} permits...`);

  // Run batch scraper
  const scrapeInput = permits.map((p) => ({
    id: p.id,
    permitNumber: p.permit_number,
    portalUrl: p.portal_url,
    scraperConfig: p.scraper_config ?? {},
  }));

  const results = await batchCheckPermits(scrapeInput);

  let changed = 0;
  let errors = 0;

  for (const permit of permits) {
    const result = results.get(permit.id);
    if (!result) continue;

    if (result.error) {
      errors++;
      continue;
    }

    const newStatus = result.status;
    const oldStatus = permit.current_status;

    // Update permit
    await supabaseAdmin
      .from("permits")
      .update({ current_status: newStatus, last_checked_at: result.scrapedAt.toISOString() })
      .eq("id", permit.id);

    // Log event
    await supabaseAdmin.from("status_events").insert({
      permit_id: permit.id,
      old_status: oldStatus,
      new_status: newStatus,
      raw_data: { raw: result.rawText },
    });

    // Alert if changed
    if (newStatus !== oldStatus && newStatus !== "ERROR") {
      changed++;
      const contractor = permit.contractor as { email: string; phone: string | null };

      await sendAlert({
        contractorEmail: contractor.email,
        contractorPhone: contractor.phone,
        permitNumber: permit.permit_number,
        city: (permit as unknown as { city: string }).city,
        oldStatus,
        newStatus,
        permitId: permit.id,
      });

      await supabaseAdmin
        .from("status_events")
        .update({ alerted_at: new Date().toISOString() })
        .eq("permit_id", permit.id)
        .is("alerted_at", null);
    }
  }

  console.log(`[cron] Done. ${changed} changes, ${errors} errors out of ${permits.length} permits.`);
  return NextResponse.json({ checked: permits.length, changed, errors });
}
