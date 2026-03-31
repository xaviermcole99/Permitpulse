"use client";

import { useState } from "react";

const S = {
  page: {
    minHeight: "100vh",
    background: "#f5f2eb",
    fontFamily: "Georgia, serif",
  } as React.CSSProperties,

  header: {
    background: "#1a1a1a",
    padding: "28px 36px 24px",
  } as React.CSSProperties,

  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  } as React.CSSProperties,

  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#f97316",
    boxShadow: "0 0 10px #f97316",
  } as React.CSSProperties,

  logoText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 24,
    fontWeight: 900,
    color: "#f5f2eb",
  } as React.CSSProperties,

  tagline: {
    color: "#7a7a6a",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
  } as React.CSSProperties,
};

export default function LandingPage() {
  const [step, setStep] = useState<"hero" | "signup" | "permits" | "done">("hero");
  const [form, setForm] = useState({ email: "", phone: "" });
  const [permits, setPermits] = useState([{ number: "", city: "", url: "" }]);
  const [frequency, setFrequency] = useState("2h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, permits, frequency }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    const { checkoutUrl } = await res.json();
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      setStep("done");
    }
  };

  const addPermit = () =>
    setPermits((p) => [...p, { number: "", city: "", url: "" }]);

  const updatePermit = (i: number, field: string, val: string) =>
    setPermits((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, [field]: val } : p))
    );

  // ── Hero ──────────────────────────────────────────────────────────────────

  if (step === "hero") {
    return (
      <div style={S.page}>
        <header style={S.header}>
          <div style={S.logo}>
            <div style={S.dot} />
            <span style={S.logoText}>PermitPulse</span>
          </div>
          <p style={S.tagline}>permit status alerts for contractors</p>
        </header>

        <main style={{ maxWidth: 680, margin: "0 auto", padding: "60px 36px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#f97316", letterSpacing: "0.2em", marginBottom: 16 }}>
            THE PROBLEM
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 900, lineHeight: 1.15, marginBottom: 24 }}>
            Stop refreshing city portals.<br />We'll text you when it changes.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: "#3a3a3a", marginBottom: 36 }}>
            Contractors waste 20–30 minutes a day manually checking if permits got
            approved. PermitPulse monitors your permits 24/7 and sends you a text
            the second the status changes — approved, rejected, needs info, whatever.
          </p>

          <div style={{ display: "flex", gap: 24, marginBottom: 48, flexWrap: "wrap" }}>
            {[
              { icon: "🔔", label: "Instant SMS + email alerts" },
              { icon: "🏙️", label: "Any city portal" },
              { icon: "📊", label: "Full status history" },
            ].map((f) => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <span style={{ color: "#3a3a3a" }}>{f.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep("signup")}
            style={{
              background: "#1a1a1a",
              color: "#f5f2eb",
              border: "none",
              padding: "16px 36px",
              borderRadius: 8,
              fontSize: 16,
              fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer",
              marginRight: 16,
            }}
          >
            Start 7-day free trial →
          </button>
          <span style={{ fontSize: 13, color: "#7a7a6a", fontFamily: "'IBM Plex Mono', monospace" }}>
            then $19/mo · cancel anytime
          </span>

          <div style={{ marginTop: 64, borderTop: "1px solid #e0dbd0", paddingTop: 40 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#7a7a6a", letterSpacing: "0.15em", marginBottom: 24 }}>
              HOW IT WORKS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {[
                { step: "01", title: "Add your permits", body: "Paste your permit numbers and the city portal URL. Takes 2 minutes." },
                { step: "02", title: "We monitor 24/7", body: "PermitPulse checks every 2 hours — or more often if you need it." },
                { step: "03", title: "Get alerted instantly", body: "The moment something changes, you get a text and email. No more manual checking." },
              ].map((h) => (
                <div key={h.step}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#f97316", marginBottom: 8 }}>{h.step}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{h.title}</div>
                  <div style={{ fontSize: 13, color: "#5a5a5a", lineHeight: 1.6 }}>{h.body}</div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Step 1: Contact info ──────────────────────────────────────────────────

  if (step === "signup") {
    return (
      <div style={S.page}>
        <header style={S.header}>
          <div style={S.logo}>
            <div style={S.dot} />
            <span style={S.logoText}>PermitPulse</span>
          </div>
          <p style={S.tagline}>step 1 of 2 — your contact info</p>
        </header>

        <main style={{ maxWidth: 480, margin: "60px auto", padding: "0 36px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Where should we send alerts?
          </h2>
          <p style={{ color: "#5a5a5a", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
            We'll text and email you the moment a permit status changes.
          </p>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Email address *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={labelStyle}>Phone number (for SMS)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: "#9a9a9a", fontFamily: "'IBM Plex Mono', monospace", marginTop: 4 }}>
              Optional, but strongly recommended.
            </div>
          </div>

          <button
            onClick={() => {
              if (!form.email) { setError("Email is required."); return; }
              setError("");
              setStep("permits");
            }}
            style={btnStyle}
          >
            Next: Add permits →
          </button>
          {error && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 12 }}>{error}</p>}
        </main>
      </div>
    );
  }

  // ── Step 2: Permits ───────────────────────────────────────────────────────

  if (step === "permits") {
    return (
      <div style={S.page}>
        <header style={S.header}>
          <div style={S.logo}>
            <div style={S.dot} />
            <span style={S.logoText}>PermitPulse</span>
          </div>
          <p style={S.tagline}>step 2 of 2 — add your permits</p>
        </header>

        <main style={{ maxWidth: 560, margin: "60px auto", padding: "0 36px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
            Which permits should we monitor?
          </h2>
          <p style={{ color: "#5a5a5a", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
            Add your active permit numbers. You can always add more later.
          </p>

          <form onSubmit={handleSignup}>
            {permits.map((p, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e0dbd0", borderRadius: 8, padding: "18px 20px", marginBottom: 14 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#f97316", marginBottom: 12 }}>
                  PERMIT {i + 1}
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Permit number *</label>
                  <input
                    required
                    value={p.number}
                    onChange={(e) => updatePermit(i, "number", e.target.value)}
                    placeholder="e.g. B2024-1234"
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>City / County *</label>
                  <input
                    required
                    value={p.city}
                    onChange={(e) => updatePermit(i, "city", e.target.value)}
                    placeholder="e.g. Los Angeles, CA"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>City portal URL *</label>
                  <input
                    required
                    type="url"
                    value={p.url}
                    onChange={(e) => updatePermit(i, "url", e.target.value)}
                    placeholder="https://permits.yourcity.gov"
                    style={inputStyle}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addPermit}
              style={{ ...btnStyle, background: "transparent", color: "#1a1a1a", border: "1px solid #1a1a1a", marginBottom: 20 }}
            >
              + Add another permit
            </button>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Check frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="1h">Every hour</option>
                <option value="2h">Every 2 hours (recommended)</option>
                <option value="4h">Every 4 hours</option>
                <option value="daily">Once a day</option>
              </select>
            </div>

            {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <button type="submit" style={btnStyle} disabled={loading}>
              {loading ? "Setting up..." : "Start 7-day free trial →"}
            </button>
            <div style={{ fontSize: 11, color: "#9a9a9a", fontFamily: "'IBM Plex Mono', monospace", marginTop: 10 }}>
              $19/mo after trial · cancel anytime · no card required to start
            </div>
          </form>
        </main>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.logo}>
          <div style={S.dot} />
          <span style={S.logoText}>PermitPulse</span>
        </div>
      </header>
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 36px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>🔔</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
          You're all set!
        </h2>
        <p style={{ color: "#3a3a3a", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
          PermitPulse is now monitoring your permits. We'll text and email you the
          moment anything changes. Check your inbox for a confirmation.
        </p>
        <a href="/dashboard" style={{ ...btnStyle, display: "inline-block", textDecoration: "none" }}>
          View your dashboard →
        </a>
      </main>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 11,
  color: "#5a5a5a",
  marginBottom: 6,
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #d0cbc0",
  borderRadius: 6,
  fontSize: 14,
  background: "#fff",
  color: "#1a1a1a",
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  background: "#1a1a1a",
  color: "#f5f2eb",
  border: "none",
  padding: "14px",
  borderRadius: 8,
  fontSize: 15,
  fontFamily: "'IBM Plex Mono', monospace",
  cursor: "pointer",
};
