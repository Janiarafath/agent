"use client";

import Link from "next/link";
import { Activity, CheckCircle2, Send, CalendarClock, MessageSquare, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function Navbar() {
  const { user } = useAuth();
  return (
    <header className="border-b border-[#e4e1f5]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-7 h-7 bg-[#5951ff] rounded flex items-center justify-center text-white text-sm font-bold">D</span>
          <span className="font-bold text-lg tracking-tight text-[#120044]">DashWin</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4c4480]">
          <a href="#product" className="hover:text-[#120044]">Product</a>
          <a href="#how" className="hover:text-[#120044]">How it works</a>
          <a href="#proof" className="hover:text-[#120044]">Results</a>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="ui-press text-sm font-semibold bg-[#5951ff] hover:bg-[#4640e0] text-white px-4 py-2 rounded">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-[#4c4480] hover:text-[#120044]">
                Sign in
              </Link>
              <Link href="/login" className="ui-press text-sm font-semibold bg-[#5951ff] hover:bg-[#4640e0] text-white px-4 py-2 rounded">
                Try now
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function Landing() {
  return (
    <div className="bg-white text-[#120044]">
      <Navbar />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 md:pt-24 md:pb-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#5951ff]">Agentic AI for revenue teams</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mt-3">
            Win the pipeline<br />before lunch.
          </h1>
          <p className="text-base text-[#4c4480] mt-4 max-w-md">
            DashWin finds business leads, verifies WhatsApp numbers, drafts outreach for your approval, and books meetings — while you sleep.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <Link href="/login" className="ui-press inline-flex items-center gap-2 bg-[#5951ff] hover:bg-[#4640e0] text-white font-semibold px-6 py-3 rounded text-sm">
              Try now <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="#how" className="ui-press inline-flex items-center gap-2 border border-[#5951ff] text-[#5951ff] hover:bg-[#efedff] font-semibold px-6 py-3 rounded text-sm">
              See how it works
            </Link>
          </div>
          <p className="text-xs text-[#a099b4] mt-4">Free trial · No credit card · Live in 10 minutes</p>
        </div>
        {/* Product snapshot mock */}
        <div className="border border-[#e4e1f5] rounded-lg overflow-hidden">
          <div className="bg-[#120044] px-4 py-2.5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white/25" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/25" />
            <span className="text-[11px] text-white/70 ml-2">DashWin pipeline</span>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3 bg-[#f6f5ff]">
            {[
              { n: "128", l: "Leads found" },
              { n: "46", l: "Ready to send" },
              { n: "12", l: "Meetings booked" },
            ].map((s) => (
              <div key={s.l} className="bg-white border border-[#e4e1f5] rounded p-3">
                <p className="tnum text-2xl font-bold">{s.n}</p>
                <p className="text-[11px] text-[#4c4480] mt-0.5">{s.l}</p>
              </div>
            ))}
            <div className="col-span-3 bg-white border border-[#e4e1f5] rounded p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="w-4 h-4 text-emerald-600" />
                Clove Dental agreed Friday 2 PM
              </div>
              <span className="text-[11px] font-bold bg-[#ecfdf5] text-emerald-700 px-2 py-1 rounded">Join call</span>
            </div>
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section id="proof" className="border-y border-[#e4e1f5] bg-[#f6f5ff]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap gap-x-12 gap-y-4 items-center">
          {[
            ["8×", "lighter engine, zero browser"],
            ["25/day", "safe sends per number"],
            ["0", "placeholders ever reach prospects"],
          ].map(([n, l]) => (
            <div key={l} className="flex items-baseline gap-3">
              <span className="tnum text-3xl font-bold text-[#5951ff]">{n}</span>
              <span className="text-sm text-[#4c4480] max-w-[180px]">{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — horizontal, not steps-down-a-page */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">From search to booked call in three moves</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { icon: <Send className="w-5 h-5" />, t: "Find & verify", d: "Type “dentists in Chennai”. DashWin discovers public business contacts and keeps only real WhatsApp numbers." },
            { icon: <MessageSquare className="w-5 h-5" />, t: "Approve & send", d: "AI drafts personal outreach. You approve with one click inside daily safety caps — never auto-blast." },
            { icon: <CalendarClock className="w-5 h-5" />, t: "Book & get pinged", d: "Replies get human-like answers. Agreements mint real Zoom links; you get pinged + dashboard card instantly." },
          ].map((c, i) => (
            <div key={c.t} className="border border-[#e4e1f5] rounded-lg p-5">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded bg-[#efedff] text-[#5951ff] flex items-center justify-center">{c.icon}</span>
                <span className="tnum text-xs font-bold text-[#a099b4]">0{i + 1}</span>
              </div>
              <h3 className="font-bold mt-4">{c.t}</h3>
              <p className="text-sm text-[#4c4480] mt-1.5 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature rows, alternating */}
      <section id="product" className="max-w-6xl mx-auto px-6 pb-16 space-y-10">
        {[
          { t: "Guardrails, not spam cannon", d: "Daily caps, work-hour awareness, instant STOP handling, self-send blocking, and honest SENT/FAILED logs. Your numbers stay unbanned because the machine refuses to misbehave.", flip: false },
          { t: "Links that never go missing", d: "Every agreed meeting mints a real joinable link, stored with time + interest. If a prospect asks “where is link?”, the agent answers from memory — placeholders can't leave the building.", flip: true },
        ].map((f) => (
          <div key={f.t} className={`grid md:grid-cols-2 gap-8 items-center ${f.flip ? "" : ""}`}>
            <div className={f.flip ? "md:order-2" : ""}>
              <h3 className="text-xl font-bold tracking-tight">{f.t}</h3>
              <p className="text-[15px] text-[#4c4480] mt-2 leading-relaxed">{f.d}</p>
              <p className="mt-4 space-y-2">
                {["Daily cap + STOP auto-handling", "LID-safe delivery + audit log"].map((x) => (
                  <span key={x} className="flex items-center gap-2 text-sm text-[#120044]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {x}
                  </span>
                ))}
              </p>
            </div>
            <div className={`bg-[#120044] rounded-lg p-6 text-white ${f.flip ? "md:order-1" : ""}`}>
              <p className="text-xs uppercase tracking-widest text-white/60">{f.flip ? "Boss alert" : "Safety"}</p>
              <p className="text-lg font-bold mt-2 leading-snug">
                {f.flip ? "HOT LEAD: Clove Dental is interested — agreed Friday 2 PM. Join: zoom.us/…" : "25 sends/day · STOP = instant opt-out · 0 fake SENTs"}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Closing CTA */}
      <section className="bg-[#120044]">
        <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row md:items-center gap-8 justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Your next 100 customers are already listed.</h2>
            <p className="text-white/70 mt-2">Launch your first campaign tonight. Wake up to replies.</p>
          </div>
          <Link href="/login" className="ui-press shrink-0 inline-flex items-center gap-2 bg-[#5951ff] hover:bg-[#4640e0] text-white font-semibold px-7 py-3 rounded text-sm">
            Try DashWin now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-[#a099b4]">
        <span className="flex items-center gap-2">
          <span className="w-5 h-5 bg-[#5951ff] rounded flex items-center justify-center text-white text-[10px] font-bold">D</span>
          DashWin — win the pipeline before lunch.
        </span>
        <span>Public business contacts only · Respects opt-outs always</span>
      </footer>
    </div>
  );
}
