/**
 * PermitPulse — Alert System
 * Sends SMS (Twilio) and/or email (Resend) when a permit status changes.
 */

import twilio from "twilio";
import { Resend } from "resend";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AlertPayload {
  contractorEmail: string;
  contractorPhone: string | null;
  permitNumber: string;
  city: string;
  oldStatus: string | null;
  newStatus: string;
  permitId: string;
}

// ── SMS ───────────────────────────────────────────────────────────────────────

export async function sendSmsAlert(payload: AlertPayload): Promise<boolean> {
  if (!payload.contractorPhone) return false;

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?permit=${payload.permitId}`;
  const changed = payload.oldStatus
    ? `changed from "${payload.oldStatus}" → "${payload.newStatus}"`
    : `is now "${payload.newStatus}"`;

  const body =
    `🔔 PermitPulse: Your permit #${payload.permitNumber} in ${payload.city} ` +
    `${changed}.\n\nView details: ${dashboardUrl}`;

  try {
    await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: payload.contractorPhone,
    });
    console.log(`[alerts] SMS sent to ${payload.contractorPhone}`);
    return true;
  } catch (err) {
    console.error("[alerts] SMS failed:", err);
    return false;
  }
}

// ── Email ─────────────────────────────────────────────────────────────────────

export async function sendEmailAlert(payload: AlertPayload): Promise<boolean> {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?permit=${payload.permitId}`;
  const changed = payload.oldStatus
    ? `<b>${payload.oldStatus}</b> → <b>${payload.newStatus}</b>`
    : `<b>${payload.newStatus}</b>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Georgia, serif; background: #f5f2eb; margin: 0; padding: 0; }
        .container { max-width: 540px; margin: 40px auto; background: #fff; border-radius: 10px; overflow: hidden; border: 1px solid #e0dbd0; }
        .header { background: #1a1a1a; padding: 28px 32px; }
        .header h1 { color: #f5f2eb; font-size: 22px; margin: 0; }
        .header p { color: #7a7a6a; font-size: 12px; font-family: monospace; margin: 6px 0 0; }
        .body { padding: 28px 32px; }
        .status-box { background: #f8f5ef; border-radius: 8px; padding: 18px 20px; margin: 20px 0; border-left: 4px solid #f97316; }
        .status-box p { margin: 0; font-size: 15px; line-height: 1.6; }
        .btn { display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-family: monospace; font-size: 13px; margin-top: 16px; }
        .footer { padding: 16px 32px; border-top: 1px solid #e0dbd0; font-size: 11px; color: #9a9a9a; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 PermitPulse</h1>
          <p>PERMIT STATUS CHANGE DETECTED</p>
        </div>
        <div class="body">
          <p>Your permit status has changed:</p>
          <div class="status-box">
            <p><b>Permit #</b> ${payload.permitNumber}</p>
            <p><b>City</b> ${payload.city}</p>
            <p><b>Status</b> ${changed}</p>
          </div>
          <a href="${dashboardUrl}" class="btn">View permit details →</a>
        </div>
        <div class="footer">
          You're receiving this because you monitor this permit with PermitPulse.<br>
          Manage your permits at <a href="${process.env.NEXT_PUBLIC_APP_URL}">${process.env.NEXT_PUBLIC_APP_URL}</a>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: payload.contractorEmail,
      subject: `🔔 Permit #${payload.permitNumber} status changed — ${payload.newStatus}`,
      html,
    });
    console.log(`[alerts] Email sent to ${payload.contractorEmail}`);
    return true;
  } catch (err) {
    console.error("[alerts] Email failed:", err);
    return false;
  }
}

// ── Send both ─────────────────────────────────────────────────────────────────

export async function sendAlert(payload: AlertPayload): Promise<{ sms: boolean; email: boolean }> {
  const [sms, email] = await Promise.all([
    sendSmsAlert(payload),
    sendEmailAlert(payload),
  ]);
  return { sms, email };
}
