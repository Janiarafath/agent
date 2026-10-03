import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ClientLayoutWrapper } from "@/components/ClientLayoutWrapper";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrowthPilot AI",
  description: "Agentic SaaS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning={true}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900" suppressHydrationWarning={true}>
        <AuthProvider>
            <ClientLayoutWrapper>
                {children}
            </ClientLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
