/**
 * POST /api/check
 * Manually trigger a status check for a single permit.
 * Used by the dashboard "Check now" button.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkPermitStatus, CITY_CONFIGS, ScraperConfig } from "@/lib/scraper";
import { sendAlert } from "@/lib/alerts";

export async function POST(req: NextRequest) {
  try {
    const { permitId } = await req.json();

    if (!permitId) {
      return NextResponse.json({ error: "permitId required" }, { status: 400 });
    }

    // Fetch the permit + contractor
    const { data: permit } = await supabaseAdmin
      .from("permits")
      .select("*, contractor:contractors(email, phone)")
      .eq("id", permitId)
      .single();

    if (!permit) {
      return NextResponse.json({ error: "Permit not found" }, { status: 404 });
    }

    // Build scraper config
    const template = (permit.scraper_config?.template as string) ?? "accela_generic";
    const baseConfig: ScraperConfig = CITY_CONFIGS[template] ?? CITY_CONFIGS["accela_generic"];
    const config: ScraperConfig = {
      ...baseConfig,
      portalUrl: permit.portal_url,
      ...(permit.scraper_config as Partial<ScraperConfig>),
    };

    // Run scraper
    const result = await checkPermitStatus(permit.permit_number, config);
    const newStatus = result.status;
    const oldStatus = permit.current_status;

    // Update permit
    await supabaseAdmin
      .from("permits")
      .update({ current_status: newStatus, last_checked_at: new Date().toISOString() })
      .eq("id", permitId);

    // Log status event always
    await supabaseAdmin.from("status_events").insert({
      permit_id: permitId,
      old_status: oldStatus,
      new_status: newStatus,
      raw_data: { raw: result.rawText, error: result.error ?? null },
    });

    // Send alert only if status actually changed
    if (newStatus !== oldStatus && newStatus !== "ERROR") {
      const contractor = permit.contractor as { email: string; phone: string | null };
      const { sms, email } = await sendAlert({
        contractorEmail: contractor.email,
        contractorPhone: contractor.phone,
        permitNumber: permit.permit_number,
        city: permit.city,
        oldStatus,
        newStatus,
        permitId,
      });

      // Mark event as alerted
      await supabaseAdmin
        .from("status_events")
        .update({ alerted_at: new Date().toISOString() })
        .eq("permit_id", permitId)
        .is("alerted_at", null);

      return NextResponse.json({ changed: true, oldStatus, newStatus, sms, email });
    }

    return NextResponse.json({ changed: false, status: newStatus });
  } catch (err) {
    console.error("[POST /api/check]", err);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
