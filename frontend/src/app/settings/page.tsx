"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Smartphone, LogOut, ArrowLeft, ShieldCheck, Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [bossPhone, setBossPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/api/settings?user_id=${user.uid}`)
      .then((r) => r.json()).catch(() => ({}))
      .then((s) => { if (s.admin_phone) setBossPhone(s.admin_phone); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const save = async () => {
    if (!user) return;
    const digits = bossPhone.replace(/\D/g, "");
    if (digits && (digits.length < 11 || digits.length > 15)) {
      alert("Boss number must include the country code (11-15 digits) — e.g. 919042500863. Bare 10-digit numbers can't receive alerts.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid, admin_phone: digits })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || `Server ${res.status}`);
      setBossPhone(json.admin_phone || digits);
      alert("Saved — AI now obeys this number as boss.");
    } catch (err: any) {
      alert(`Save failed: ${err?.message || err}`);
    }
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-[#0B0B14] mt-4">Sign in to open settings</h1>
        <Link href="/login" className="inline-block mt-6 bg-[#2E4BFF] hover:bg-[#1D33D6] text-white font-semibold px-6 py-2.5 rounded-xl text-sm">Go to sign in</Link>
      </div>
    );
  }

  const isGoogle = (user.providerData || []).some((p: any) => p?.providerId === "google.com");
  const joined = (() => { try { return new Date((user as any).metadata?.creationTime).toLocaleDateString("en-IN", { month: "short", year: "numeric" }); } catch { return ""; } })();

  return (
    <div className="bg-[#f4f5fa] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-5 md:space-y-6">
        <Link href="/dashboard" className="ui-press inline-flex items-center gap-2 border border-[#e4e1f5] bg-white hover:border-[#2E4BFF] text-[#0B0B14] text-sm font-semibold px-4 py-2 rounded-xl shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        {/* Identity hero */}
        <section className="relative overflow-hidden rounded-2xl bg-[#0B0B14] text-white p-6 md:p-8 shadow-sm">
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#2E4BFF]/40 blur-[100px] pointer-events-none animate-drift-a" />
          <div className="absolute -bottom-28 -left-10 w-72 h-72 rounded-full bg-fuchsia-600/20 blur-[110px] pointer-events-none animate-drift-b" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-16 h-16 rounded-2xl border-2 border-white/20" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#2E4BFF] text-white font-extrabold flex items-center justify-center text-2xl">
                {(user.displayName || user.email || "D")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight truncate">{user.displayName || "DashWin user"}</h1>
                <span className="text-[11px] font-bold bg-white/10 border border-white/15 text-white/80 px-2.5 py-1 rounded-full">
                  {isGoogle ? "Google account" : "Email account"}
                </span>
              </div>
              <p className="text-sm text-white/60 truncate mt-0.5">{user.email}</p>
              <p className="text-[11px] text-white/40 mt-1">{joined ? `Member since ${joined} · ` : ""}Pioneer seat · all data stays yours</p>
            </div>
            <button onClick={async () => { await logout(); router.replace("/"); }}
              className="ui-press shrink-0 inline-flex items-center gap-2 border border-white/20 text-white/80 hover:bg-white/10 hover:text-white text-sm font-bold px-4 py-2.5 rounded-xl">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-5 md:gap-6 items-start">
          {/* Boss number */}
          <section className="bg-white border border-[#e4e1f5] rounded-2xl shadow-sm p-5 md:p-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-[#0B0B14]">Boss number</h2>
                <p className="text-[11px] text-[#4c4480]">AI obeys it · never pitches it · alerts land here</p>
              </div>
            </div>
            {loading ? <Loader2 className="w-5 h-5 animate-spin mt-5 text-[#2E4BFF]" /> : (
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <div className="relative flex-1">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                  <input value={bossPhone} onChange={(e) => setBossPhone(e.target.value)} placeholder="919042500863" inputMode="tel"
                    className="w-full border border-[#e4e1f5] rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#2E4BFF] focus:ring-2 focus:ring-[#2E4BFF]/20" />
                </div>
                <button onClick={save} disabled={saving}
                  className="ui-press bg-[#2E4BFF] hover:bg-[#1D33D6] disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save
                </button>
              </div>
            )}
            <p className="text-[11px] text-[#a099b4] mt-3">Full international digits WITH country code — e.g. <b>919042500863</b>. Bare 10-digit numbers are rejected.</p>
          </section>

          {/* Security */}
          <section className="bg-white border border-[#e4e1f5] rounded-2xl shadow-sm p-5 md:p-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#2E4BFF]/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#2E4BFF]" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-[#0B0B14]">Sign-in & security</h2>
                <p className="text-[11px] text-[#4c4480]">How you get in · what we store</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5 text-sm text-[#4c4480]">
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Signed in with {isGoogle ? "Google (verified by Google)" : "a verified email"} — no passwords stored by us</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Your leads, chats and meetings are scoped to your account only</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> Forget a device? Sign out here, then sign in fresh — old sessions die</li>
            </ul>
            <Link href="/usage" className="ui-press mt-5 inline-flex items-center gap-2 border border-[#e4e1f5] hover:border-[#2E4BFF] text-sm font-bold px-4 py-2.5 rounded-xl text-[#0B0B14]">
              <Wallet className="w-4 h-4 text-[#2E4BFF]" /> Plan, usage & AI ledger →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
