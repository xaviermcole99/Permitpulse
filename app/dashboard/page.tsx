"use client";

import { useState, useEffect } from "react";

interface Permit {
  id: string;
  permit_number: string;
  city: string;
  current_status: string | null;
  last_checked_at: string | null;
  active: boolean;
  events: Array<{ new_status: string; old_status: string | null; created_at: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "#22c55e",
  APPROVED_WITH_CONDITIONS: "#86efac",
  REJECTED: "#ef4444",
  DENIED: "#ef4444",
  "NEEDS INFO": "#f97316",
  "UNDER REVIEW": "#3b82f6",
  PENDING: "#8b5cf6",
  ISSUED: "#22c55e",
  CLOSED: "#9a9a9a",
  ERROR: "#ef4444",
};

function statusColor(status: string | null) {
  if (!status) return "#9a9a9a";
  return STATUS_COLORS[status.toUpperCase()] ?? "#1a1a1a";
}

export default function Dashboard() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const fetchPermits = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/permits?email=${encodeURIComponent(email)}`);
    if (res.ok) {
      const data = await res.json();
      setPermits(data.permits ?? []);
      setAuthenticated(true);
    }
    setLoading(false);
  };

  const triggerCheck = async (permitId: string) => {
    setChecking(permitId);
    await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permitId }),
    });
    await fetchPermits();
    setChecking(null);
  };

  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f2eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", border: "1px solid #e0dbd0", borderRadius: 12, padding: "40px 48px", maxWidth: 400, width: "100%" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#f97316", marginBottom: 8 }}>PERMITPULSE</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Your permits</h2>
          <form onSubmit={fetchPermits}>
            <label style={{ display: "block", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#5a5a5a", marginBottom: 6 }}>
              Enter your email to view your permits
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{ display: "block", width: "100%", padding: "10px 14px", border: "1px solid #d0cbc0", borderRadius: 6, fontSize: 14, marginBottom: 16 }}
            />
            <button
              type="submit"
              style={{ display: "block", width: "100%", background: "#1a1a1a", color: "#f5f2eb", border: "none", padding: "12px", borderRadius: 8, fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}
            >
              View permits →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2eb", fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <div style={{ background: "#1a1a1a", padding: "20px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316", boxShadow: "0 0 8px #f97316" }} />
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 900, color: "#f5f2eb" }}>PermitPulse</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#7a7a6a", marginLeft: 8 }}>dashboard</span>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "36px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>Your Permits</h1>
          <a href="/" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#5a5a5a", textDecoration: "none" }}>
            + Add permits
          </a>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#7a7a6a", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
            Loading permits...
          </div>
        ) : permits.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
            <p style={{ color: "#5a5a5a", fontSize: 15 }}>No permits found for this email.</p>
            <a href="/" style={{ color: "#f97316", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>Add your first permit →</a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {permits.map((permit) => (
              <div key={permit.id} style={{ background: "#fff", border: "1px solid #e0dbd0", borderRadius: 10, padding: "22px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#7a7a6a", marginBottom: 4 }}>{permit.city}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700 }}>#{permit.permit_number}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      padding: "5px 12px",
                      borderRadius: 20,
                      background: `${statusColor(permit.current_status)}18`,
                      color: statusColor(permit.current_status),
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 11,
                      fontWeight: 500,
                    }}>
                      {permit.current_status ?? "Not checked yet"}
                    </div>
                    <button
                      onClick={() => triggerCheck(permit.id)}
                      disabled={checking === permit.id}
                      style={{
                        padding: "5px 12px",
                        background: "transparent",
                        border: "1px solid #d0cbc0",
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: "'IBM Plex Mono', monospace",
                        cursor: "pointer",
                        color: "#5a5a5a",
                      }}
                    >
                      {checking === permit.id ? "Checking..." : "Check now"}
                    </button>
                  </div>
                </div>

                {permit.last_checked_at && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#9a9a9a", marginBottom: 14 }}>
                    Last checked: {new Date(permit.last_checked_at).toLocaleString()}
                  </div>
                )}

                {/* Status history */}
                {permit.events && permit.events.length > 0 && (
                  <div style={{ borderTop: "1px solid #f0ece4", paddingTop: 14 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#9a9a9a", marginBottom: 10 }}>HISTORY</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {permit.events.slice(0, 5).map((ev, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span style={{ color: "#3a3a3a" }}>
                            {ev.old_status ? `${ev.old_status} → ` : ""}<b>{ev.new_status}</b>
                          </span>
                          <span style={{ color: "#9a9a9a", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>
                            {new Date(ev.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
