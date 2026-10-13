"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, Loader2, Mail, Phone, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

export default function UsagePage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/api/usage/history?user_id=${user.uid}`)
      .then((r) => r.json()).catch(() => ({}))
      .then((j) => { setData(j); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-[#0B0B14]">Sign in to see usage</h1>
        <Link href="/login" className="inline-block mt-6 bg-[#2E4BFF] text-white font-semibold px-6 py-2.5 rounded-xl text-sm">Go to sign in</Link>
      </div>
    );
  }

  const today = data?.days?.[0];
  const pct = (u: number, l: number) => (l || 0) <= 0 ? 0 : Math.min(100, Math.round(((u || 0) / l) * 100));

  return (
    <div className="bg-[#f4f5fa] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-5 md:space-y-6">
        <Link href="/dashboard" className="ui-press inline-flex items-center gap-2 border border-[#e4e1f5] bg-white hover:border-[#2E4BFF] text-[#0B0B14] text-sm font-semibold px-4 py-2 rounded-xl shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0B0B14]">Plan & AI ledger</h1>
          <p className="text-sm text-[#4c4480] mt-0.5">Every send and AI reply, counted daily. Resets midnight IST.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-5 md:gap-6 items-start">
          {/* Plan card */}
          <section className="lg:col-span-3 relative overflow-hidden rounded-2xl bg-[#0B0B14] text-white p-6 md:p-7 shadow-sm">
            <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#2E4BFF]/40 blur-[100px] pointer-events-none animate-drift-a" />
            <div className="absolute -bottom-28 -left-10 w-72 h-72 rounded-full bg-fuchsia-600/20 blur-[110px] pointer-events-none animate-drift-b" />
            <div className="relative flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-300" />
              <h2 className="text-lg font-extrabold capitalize">Plan · {data?.plan || "free"}</h2>
              <span className="tnum ml-auto text-sm text-white/60">₹{data?.price_inr ?? 0}/mo</span>
            </div>
            {loading ? <Loader2 className="w-5 h-5 animate-spin mt-6 text-white/60" /> : (
              <div className="relative mt-6 space-y-5">
                {[["Messages sent today", today?.messages ?? 0, data?.messages_limit ?? 0],
                  ["AI replies today", today?.ai ?? 0, data?.ai_limit ?? 0]].map(([l, u, lim]: any) => (
                  lim === 0 ? (
                    <div key={l} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <span className="text-sm text-white/70 font-semibold">{l}</span>
                      <span className="text-xs font-bold text-amber-300">Locked on Free</span>
                    </div>
                  ) : (
                    <div key={l}>
                      <div className="flex justify-between text-sm font-semibold"><span className="text-white/80">{l}</span><span className="tnum text-white">{u} / {lim}</span></div>
                      <div className="h-2.5 bg-white/15 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#8B93FF] via-[#2E4BFF] to-[#22d3ee] rounded-full transition-all" style={{ width: `${pct(u, lim)}%` }} />
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
            <div className="relative mt-6 rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="text-sm font-extrabold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-300" /> Need a paid plan?</p>
              <p className="text-xs text-white/60 mt-1">Upgrades are personal for now — message us and we switch you on.</p>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <a href="mailto:ajaniarafath@gmail.com?subject=DashWin%20paid%20plan" className="ui-press inline-flex items-center justify-center gap-2 bg-white text-[#0B0B14] text-xs font-bold px-4 py-2.5 rounded-lg">
                  <Mail className="w-3.5 h-3.5" /> ajaniarafath@gmail.com
                </a>
                <a href="tel:+918148647818" className="ui-press inline-flex items-center justify-center gap-2 border border-white/25 text-white hover:bg-white/10 text-xs font-bold px-4 py-2.5 rounded-lg">
                  <Phone className="w-3.5 h-3.5" /> +91 81486 47818
                </a>
              </div>
            </div>
          </section>

          {/* Ledger */}
          <section className="lg:col-span-2 bg-white border border-[#e4e1f5] rounded-2xl shadow-sm p-5 md:p-6">
            <h2 className="text-base font-extrabold text-[#0B0B14]">Daily ledger</h2>
            <p className="text-[11px] text-[#4c4480] mt-0.5 mb-4">Last 14 days · newest first{data?.seats_left != null ? ` · ${data.seats_left} pioneer seats left` : ""}</p>
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-[#2E4BFF]" /> : (
              !(data?.days || []).length ? (
                <p className="text-sm text-[#a099b4]">Nothing counted yet — approve your first send and it lands here.</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto -mx-1 px-1">
                  {(data.days || []).map((d: any) => (
                    <div key={d.day} className="flex items-center gap-3 py-2.5">
                      <span className="tnum text-xs font-bold text-[#0B0B14] w-24 shrink-0">{d.day}</span>
                      <span className="tnum text-xs text-[#4c4480]">{d.messages} sent</span>
                      <span className="tnum text-xs text-[#4c4480] ml-auto">{d.ai} AI</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
