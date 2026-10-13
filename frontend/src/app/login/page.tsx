"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { DashWinLogo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function Login() {
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [gateMsg, setGateMsg] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"google" | "email">("google");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const claimed = useRef(false);
  const { logout } = useAuth();

  useEffect(() => {
    if (!user || claimed.current) return;
    claimed.current = true;
    const isPasswordUser = (user.providerData || []).some((p: any) => p?.providerId === "password");
    if (isPasswordUser && !user.emailVerified) {
      setNotice("Verify your email first — we sent you a link (check inbox + spam). Then sign in again.");
      logout();
      claimed.current = false;
      setBusy(false);
      return;
    }
    // First touch claims an early-access seat (15 pioneers, then waitlist).
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

  const goGoogle = async () => {
    setBusy(true); setGateMsg(""); setNotice("");
    try {
      await loginWithGoogle();
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (!msg.includes("popup-closed")) alert(msg);
      setBusy(false);
    }
  };

  const goEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setGateMsg(""); setNotice("");
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
        setNotice("Account created — check your inbox (and spam) for the verification link, then sign in.");
      }
    } catch (err: any) {
      alert(err?.message || String(err));
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden md:flex w-[44%] flex-col justify-between p-12 bg-[#0B0B14] text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#2E4BFF]/30 blur-[110px] animate-drift-a pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-fuchsia-500/20 blur-[120px] animate-drift-b pointer-events-none" />
        <Link href="/" className="relative z-10 w-max">
          <DashWinLogo dark size={32} />
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
        <p className="text-xs text-white/40">Closed beta · 15 pioneer seats</p>
      </div>
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="md:hidden mb-6 w-max">
            <DashWinLogo />
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-[#0B0B14]">Join the launch</h2>
          <p className="text-sm text-[#4c4480] mt-1 mb-6">Google or verified email. No spam — ever.</p>

          <div className="flex bg-slate-100 rounded-lg p-1 mb-5">
            {(["google", "email"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 text-sm font-bold py-2 rounded-md transition-all ${tab === t ? "bg-white shadow text-[#0B0B14]" : "text-[#4c4480]"}`}>
                {t === "google" ? "Google" : "Email"}
              </button>
            ))}
          </div>

          {tab === "google" ? (
            <button onClick={goGoogle} disabled={busy}
              className="ui-press w-full bg-white border-2 border-slate-200 hover:border-[#2E4BFF] rounded-xl px-4 py-3 font-bold text-[#0B0B14] flex items-center justify-center gap-3 disabled:opacity-60">
              {busy ? <Loader2 className="w-5 h-5 animate-spin text-[#2E4BFF]" /> : (
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" /></svg>
              )}
              {busy ? "Checking your seat…" : "Continue with Google"}
            </button>
          ) : (
            <form onSubmit={goEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4c4480] mb-1">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full bg-white border border-[#e4e1f5] rounded-lg px-4 py-2.5 text-[#0B0B14] text-sm focus:outline-none focus:ring-2 focus:ring-[#2E4BFF]/30 focus:border-[#2E4BFF]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4c4480] mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className="w-full bg-white border border-[#e4e1f5] rounded-lg px-4 py-2.5 text-[#0B0B14] text-sm focus:outline-none focus:ring-2 focus:ring-[#2E4BFF]/30 focus:border-[#2E4BFF]" />
              </div>
              <button type="submit" disabled={busy}
                className="ui-press w-full bg-[#2E4BFF] hover:bg-[#1D33D6] disabled:opacity-60 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {isLogin ? "Sign in" : "Create account"}
              </button>
              <p className="text-center text-sm text-[#4c4480]">
                {isLogin ? "New here?" : "Have an account?"}
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="ml-2 font-bold text-[#2E4BFF]">
                  {isLogin ? "Create one" : "Sign in"}
                </button>
              </p>
            </form>
          )}

          {notice && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 font-medium">
              {notice}
            </div>
          )}
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
