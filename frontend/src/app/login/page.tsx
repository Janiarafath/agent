"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { DashWinLogo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function Login() {
  const { user, loginWithGoogle, logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [gateMsg, setGateMsg] = useState("");
  const claimed = useRef(false);

  useEffect(() => {
    if (!user || claimed.current) return;
    claimed.current = true;
    // First touch claims an early-access seat (25 pioneers, then waitlist).
    fetch(`${API_BASE}/api/settings`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.uid, email: user.email || "" }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setGateMsg(json.detail || "Early access is full — you're on the waitlist.");
          await logout();
          claimed.current = false;
          setBusy(false);
          return;
        }
        router.replace("/dashboard");
      })
      .catch(() => router.replace("/dashboard"));
  }, [user, router, logout]);

  const go = async () => {
    setBusy(true); setGateMsg("");
    try {
      await loginWithGoogle();
      // useEffect above claims the seat / redirects.
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (!msg.includes("popup-closed")) alert(msg);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden md:flex w-[44%] flex-col justify-between p-12 bg-[#0B0B14] text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#2E4BFF]/30 blur-[110px] animate-drift-a pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-fuchsia-500/20 blur-[120px] animate-drift-b pointer-events-none" />
        <Link href="/" className="relative z-10 w-max">
          <DashWinLogo dark />
        </Link>
        <div className="relative z-10">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-3xl font-bold leading-tight tracking-tight">Your pipeline,<br />warming itself up.</motion.h1>
          <ul className="mt-6 space-y-3 text-sm text-white/70">
            <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Leads found while you were away</li>
            <li className="flex gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Replies answered like a human SDR</li>
            <li className="flex gap-3"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> Meetings booked with real links</li>
          </ul>
        </div>
        <p className="text-xs text-white/40">Closed beta · 25 pioneer seats</p>
      </div>
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="md:hidden mb-6 w-max">
            <DashWinLogo />
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-[#0B0B14]">Join the launch</h2>
          <p className="text-sm text-[#4c4480] mt-1 mb-6">Google sign-in only. No passwords, no spam — ever.</p>
          <button onClick={go} disabled={busy}
            className="ui-press w-full bg-white border-2 border-slate-200 hover:border-[#2E4BFF] rounded-xl px-4 py-3 font-bold text-[#0B0B14] flex items-center justify-center gap-3 disabled:opacity-60">
            {busy ? <Loader2 className="w-5 h-5 animate-spin text-[#2E4BFF]" /> : (
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" /></svg>
            )}
            {busy ? "Checking your seat…" : "Continue with Google"}
          </button>
          {gateMsg && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-medium">
              {gateMsg}
            </div>
          )}
          <p className="text-center mt-4 text-xs">
            <Link href="/" className="text-[#a099b4] hover:text-[#0B0B14]">← Back to site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
