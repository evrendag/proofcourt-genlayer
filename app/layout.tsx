import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PROOFCOURT — Proof-of-work receipts for AI agents",
  description: "Audit AI-agent deliveries against live public evidence and issue reusable GenLayer consensus receipts.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased">{children}</body></html>;
}
