import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ClientLayoutWrapper } from "@/components/ClientLayoutWrapper";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DashWin — Agentic AI Platform for Revenue Teams",
  description: "DashWin finds business leads, verifies WhatsApp, drafts outreach and books meetings on autopilot.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${lexend.variable} h-full antialiased`}
      suppressHydrationWarning={true}
    >
      <body className="min-h-full flex flex-col bg-white text-[#120044]" suppressHydrationWarning={true}>
        <AuthProvider>
            <ClientLayoutWrapper>
                {children}
            </ClientLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
