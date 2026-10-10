"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Smartphone, LogOut, Crown, ArrowLeft } from "lucide-react";
import { DashWinLogo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [bossPhone, setBossPhone] = useState("");
  const [usage, setUsage] = useState<any>(null);
  const [planSel, setPlanSel] = useState("free");
  const [savingPlan, setSavingPlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = () => {
      Promise.all([
        fetch(`${API_BASE}/api/settings?user_id=${user.uid}`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/usage?user_id=${user.uid}`).then((r) => r.json()).catch(() => ({})),
      ]).then(([s, u]) => {
        if (s.admin_phone) setBossPhone(s.admin_phone);
        if (s.plan) setPlanSel(s.plan);
        setUsage(u);
        setLoading(false);
      }).catch(() => setLoading(false));
    };
    load();
    const t = setInterval(load, 5000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid, admin_phone: bossPhone })
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      alert("Saved — AI now obeys this number as boss.");
    } catch (err: any) {
      alert(`Save failed: ${err?.message || err}`);
    }
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-[#0B0B14]">Sign in to open settings</h1>
        <Link href="/login" className="inline-block mt-6 bg-[#2E4BFF] text-white font-semibold px-6 py-2.5 rounded text-sm">Go to sign in</Link>
      </div>
    );
  }

  const changePlan = async (plan: string) => {
    if (!user) return;
    setSavingPlan(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid, plan })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || `Server ${res.status}`);
      setPlanSel(plan);
      setUsage(json.usage || usage);
    } catch (err: any) {
      alert(`Plan change failed: ${err?.message || err}`);
    }
    setSavingPlan(false);
  };

  const pct = (u: number, l: number) => Math.min(100, Math.round(((u || 0) / Math.max(1, l || 1)) * 100));

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <Link href="/dashboard" className="text-xs font-bold text-[#2E4BFF] hover:text-[#1D33D6]">← Back to dashboard</Link>
      <div className="flex items-center gap-3">
        <DashWinLogo />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0B0B14]">Settings</h1>
          <p className="text-sm text-[#4c4480] mt-0.5">Identity, boss number, plan and live usage.</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live meters
        </span>
      </div>

      <section className="bg-white border border-[#e4e1f5] rounded-lg p-5">
        <h2 className="text-sm font-bold text-[#0B0B14]">Account</h2>
        <p className="text-sm text-[#4c4480] mt-1">{user.email}</p>
        <button onClick={async () => { await logout(); router.replace("/"); }}
          className="mt-3 inline-flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold px-4 py-2 rounded">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </section>

      <section className="bg-white border border-[#e4e1f5] rounded-lg p-5">
        <h2 className="text-sm font-bold text-[#0B0B14]">Your number = boss</h2>
        <p className="text-xs text-[#4c4480] mt-1">AI obeys this number, never pitches it. HOT LEAD alerts land here too.</p>
        {loading ? <Loader2 className="w-4 h-4 animate-spin mt-3 text-[#2E4BFF]" /> : (
          <div className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
              <input value={bossPhone} onChange={(e) => setBossPhone(e.target.value)} placeholder="919876543210"
                className="w-full border border-[#e4e1f5] rounded pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#2E4BFF]" />
            </div>
            <button onClick={save} disabled={saving}
              className="bg-[#2E4BFF] hover:bg-[#1D33D6] disabled:opacity-50 text-white text-sm font-bold px-5 rounded flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save
            </button>
          </div>
        )}
      </section>

      <section className="bg-[#0B0B14] rounded-lg p-5 text-white">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-300" />
          <h2 className="text-sm font-bold">Plan · {usage?.plan || "free"}</h2>
          <span className="tnum ml-auto text-xs text-white/60">₹{usage?.price_inr ?? 0}/mo</span>
        </div>
        {loading ? <Loader2 className="w-4 h-4 animate-spin mt-4 text-white/60" /> : (
          <div className="mt-4 space-y-3 text-xs">
            {[["Messages today", usage?.messages_used, usage?.messages_limit],
              ["AI replies today", usage?.ai_used, usage?.ai_limit]].map(([l, u, lim]: any) => (
              <div key={l}>
                <div className="flex justify-between text-white/70"><span>{l}</span><span className="tnum">{u || 0} / {lim || 0}</span></div>
                <div className="h-1.5 bg-white/15 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#7c6cff] to-[#2E4BFF] rounded-full transition-all" style={{ width: `${pct(u, lim)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <Link href="/pricing" className="inline-block mt-4 text-xs font-bold text-white underline underline-offset-4 hover:text-white/80">Compare plans →</Link>
        <div className="flex flex-wrap gap-2 mt-4">
          {["free", "starter", "growth", "pro"].map((p) => (
            <button key={p} onClick={() => changePlan(p)} disabled={savingPlan || planSel === p}
              className={`text-xs font-bold px-4 py-1.5 rounded transition-all ${planSel === p ? "bg-white text-[#0B0B14]" : "border border-white/30 text-white hover:bg-white/10 disabled:opacity-50"}`}>
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
