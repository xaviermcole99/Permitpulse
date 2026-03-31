import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PermitPulse — Permit Status Alerts for Contractors",
  description:
    "Stop manually checking city portals. PermitPulse texts and emails you the moment your permit status changes. $19/mo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Georgia, serif; background: #f5f2eb; color: #1a1a1a; }
          a { color: inherit; }
          input, button, select, textarea { font-family: inherit; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
