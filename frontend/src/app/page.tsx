"use client";

import Link from "next/link";
import { Activity, CheckCircle2, Send, CalendarClock, MessageSquare, ArrowRight, ShieldCheck, Zap, Users } from "lucide-react";
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
          <a href="#customers" className="hover:text-[#120044]">Customers</a>
          <a href="#pricing" className="hover:text-[#120044]">Pricing</a>
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
          <p className="text-xs font-bold uppercase tracking-widest text-[#5951ff]">Agentic AI platform for revenue teams</p>
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
            <Link href="/login" className="ui-press inline-flex items-center gap-2 border border-[#5951ff] text-[#5951ff] hover:bg-[#efedff] font-semibold px-6 py-3 rounded text-sm">
              Get a demo
            </Link>
          </div>
          <p className="text-xs text-[#a099b4] mt-4">Free trial · No credit card · Live in 10 minutes</p>
        </div>
        <div className="border border-[#e4e1f5] rounded overflow-hidden">
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

      {/* Customers strip */}
      <section id="customers" className="border-y border-[#e4e1f5]">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#a099b4]">Built for local revenue teams</p>
          <div className="flex flex-wrap gap-x-10 gap-y-3 mt-4 text-lg font-bold text-[#120044]/70">
            {["Dental clinics", "Salons & spas", "Real estate", "Repair shops", "Coaching centers", "Restaurants"].map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section className="bg-[#f6f5ff] border-b border-[#e4e1f5]">
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

      {/* Positioning */}
      <section className="bg-[#120044]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            You didn&apos;t hire enough sellers. Now you don&apos;t have to.
          </h2>
          <div>
            <p className="text-white/70 leading-relaxed">
              One DashWin agent discovers leads, verifies numbers, drafts outreach, answers replies like a human, and books calls with real links — the work of three hires, running 24/7.
            </p>
            <Link href="#product" className="ui-press inline-flex items-center gap-2 mt-6 border border-[#5951ff] text-white hover:bg-white/10 font-semibold px-6 py-3 rounded text-sm">
              Learn more <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Platform accordion */}
      <section id="product" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">One agentic AI platform for revenue teams.</h2>
        <p className="text-[#4c4480] mt-2">Purpose-built to orchestrate every stage of your pipeline.</p>
        <div className="mt-8 border-t border-[#e4e1f5]">
          {[
            { t: "Give every seller an AI teammate", d: "DashWin agents surface the right prospects, verify their WhatsApp, handle the research, and guide you on what to approve next." },
            { t: "Engage every stranger like an owner", d: "Anyone messaging your number gets a warm human-like assistant that answers, qualifies, and books calls — even at 3 AM." },
            { t: "Close without adding headcount", d: "Agents flag hot replies, mint real meeting links, and ping you with interest + time + join button the second deals move." },
            { t: "Stay safe while scaling", d: "Daily caps, STOP auto-handling, LID-safe delivery, honest SENT/FAILED logs. Growth with guardrails, not bans." },
          ].map((c) => (
            <details key={c.t} className="group border-b border-[#e4e1f5] py-4" open={c.t.startsWith("Give every")}>
              <summary className="flex items-center justify-between cursor-pointer font-bold list-none">
                {c.t}
                <span className="text-[#5951ff] group-open:rotate-45 transition-transform duration-200 text-xl leading-none">+</span>
              </summary>
              <p className="text-sm text-[#4c4480] mt-2 leading-relaxed max-w-2xl">{c.d}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Trust trio */}
      <section className="border-y border-[#e4e1f5] bg-[#f6f5ff]">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">A trusted sales platform</h2>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {[
              { t: "Safety", d: "Caps, opt-outs, and audit logs on every action. Numbers stay unbanned by design." },
              { t: "Privacy", d: "Secrets live in vaults, never in code. Customer chats stay yours — no mystery boxes." },
              { t: "Control", d: "Nothing sends without your approve. Human takeover mutes AI instantly per chat." },
            ].map((c) => (
              <div key={c.t} className="bg-white border border-[#e4e1f5] rounded p-5">
                <ShieldCheck className="w-5 h-5 text-[#5951ff]" />
                <h3 className="font-bold mt-3">{c.t}</h3>
                <p className="text-sm text-[#4c4480] mt-1.5 leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quotes */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-4">
        {[
          { q: "Evening enquiries used to wait till morning. Now the assistant answers in seconds and books Friday demos.", n: "Dental chain owner", r: "Chennai" },
          { q: "It books meetings while I sleep and only pings me when someone is actually interested.", n: "Agency founder", r: "Early user" },
        ].map((c) => (
          <figure key={c.n} className="border border-[#e4e1f5] rounded p-6">
            <blockquote className="text-[15px] leading-relaxed">“{c.q}”</blockquote>
            <figcaption className="text-xs text-[#4c4480] mt-3 font-semibold">{c.n} · {c.r}</figcaption>
          </figure>
        ))}
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">From search to booked call in three moves</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { icon: <Send className="w-5 h-5" />, t: "Find & verify", d: "Type “dentists in Chennai”. DashWin discovers public business contacts and keeps only real WhatsApp numbers." },
            { icon: <MessageSquare className="w-5 h-5" />, t: "Approve & send", d: "AI drafts personal outreach. You approve with one click inside daily safety caps — never auto-blast." },
            { icon: <CalendarClock className="w-5 h-5" />, t: "Book & get pinged", d: "Replies get human-like answers. Agreements mint real Zoom links; you get pinged + dashboard card instantly." },
          ].map((c, i) => (
            <div key={c.t} className="border border-[#e4e1f5] rounded p-5">
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

      {/* Innovation highlights */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">New agentic highlights</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { icon: <ShieldCheck className="w-5 h-5" />, t: "Guardrails, not spam cannon", d: "Daily caps, STOP auto-handling, self-send blocking, honest SENT/FAILED logs. Numbers stay unbanned because the machine refuses to misbehave." },
            { icon: <Zap className="w-5 h-5" />, t: "Links that never go missing", d: "Every agreement mints a real joinable link with time + interest saved. “Where is link?” gets answered from memory — placeholders can't leave." },
            { icon: <Users className="w-5 h-5" />, t: "Takeover when you're away", d: "Owner silent? The assistant answers on your behalf, books calls, and mutes the instant you step in. Resumes alone after 24h." },
          ].map((c) => (
            <div key={c.t} className="bg-[#f6f5ff] border border-[#e4e1f5] rounded p-5">
              <span className="w-9 h-9 rounded bg-white border border-[#e4e1f5] text-[#5951ff] flex items-center justify-center">{c.icon}</span>
              <h3 className="font-bold mt-4">{c.t}</h3>
              <p className="text-sm text-[#4c4480] mt-1.5 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Case study */}
      <section className="border-y border-[#e4e1f5] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#5951ff]">Customer story</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mt-2">A Chennai clinic chain cut lead response to minutes.</h2>
            <p className="text-[#4c4480] mt-3 leading-relaxed">Evening enquiries used to wait till morning. Now the assistant answers in seconds, qualifies, and books Friday demos — the owner only sees HOT LEAD pings and a full Meetings board.</p>
            <div className="flex gap-8 mt-6">
              <div><p className="tnum text-3xl font-bold text-[#5951ff]">~60s</p><p className="text-xs text-[#4c4480] mt-1">median first reply</p></div>
              <div><p className="tnum text-3xl font-bold text-[#5951ff]">3×</p><p className="text-xs text-[#4c4480] mt-1">more demos booked</p></div>
            </div>
          </div>
          <div className="border border-[#e4e1f5] rounded overflow-hidden">
            <div className="bg-[#120044] px-4 py-2.5 text-[11px] text-white/70">Live booking alert</div>
            <div className="p-5">
              <p className="text-sm font-bold">HOT LEAD: Clove Dental is interested</p>
              <p className="text-sm text-[#4c4480] mt-1">Agreed Friday 2 PM · Join: zoom.us/…</p>
              <div className="mt-4 flex gap-2">
                <span className="text-[11px] font-bold bg-[#ecfdf5] text-emerald-700 px-2 py-1 rounded">WhatsApp pinged</span>
                <span className="text-[11px] font-bold bg-[#efedff] text-[#5951ff] px-2 py-1 rounded">Dashboard card live</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Pricing that starts at zero</h2>
        <p className="text-[#4c4480] mt-2">Start free. Pay when customers pay you. <a href="#pricing" className="font-semibold text-[#5951ff]">View pricing info</a></p>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { n: "Starter", p: "Free", f: ["1 WhatsApp sender", "25 sends / day", "AI replies + bookings"], hot: false },
            { n: "Growth", p: "₹999/mo", f: ["5 senders", "Lazy sessions", "Priority discovery"], hot: true },
            { n: "Scale", p: "Talk to us", f: ["Unlimited senders", "Official API path", "Dedicated support"], hot: false },
          ].map((t) => (
            <div key={t.n} className={`rounded p-6 ${t.hot ? "bg-[#120044] text-white" : "border border-[#e4e1f5]"}`}>
              <p className="text-sm font-bold uppercase tracking-widest opacity-70">{t.n}</p>
              <p className="tnum text-3xl font-bold mt-2">{t.p}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {t.f.map((f) => (
                  <li key={f} className="flex gap-2"><CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${t.hot ? "text-emerald-400" : "text-emerald-600"}`} /> <span className={t.hot ? "text-white/80" : "text-[#4c4480]"}>{f}</span></li>
                ))}
              </ul>
              <Link href="/login" className={`ui-press block text-center mt-6 font-semibold px-4 py-2.5 rounded text-sm ${t.hot ? "bg-[#5951ff] hover:bg-[#4640e0] text-white" : "border border-[#5951ff] text-[#5951ff] hover:bg-[#efedff]"}`}>
                {t.hot ? "Start trial" : "Try now"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Trust + closing */}
      <section className="bg-[#120044]">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-wrap gap-x-10 gap-y-3 text-white/60 text-sm font-semibold">
            {["Public contacts only", "Opt-outs respected", "No fake SENTs", "Secrets never in git"].map((t) => (
              <span key={t} className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> {t}</span>
            ))}
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-8 justify-between mt-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">One agentic platform for revenue teams.</h2>
              <p className="text-white/70 mt-2">Launch tonight. Wake up to replies.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="ui-press inline-flex items-center gap-2 bg-[#5951ff] hover:bg-[#4640e0] text-white font-semibold px-7 py-3 rounded text-sm">
                Request a demo
              </Link>
              <Link href="/login" className="ui-press inline-flex items-center gap-2 border border-white/40 text-white hover:bg-white/10 font-semibold px-7 py-3 rounded text-sm">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <span className="flex items-center gap-2 font-bold text-[#120044]">
            <span className="w-6 h-6 bg-[#5951ff] rounded flex items-center justify-center text-white text-[11px] font-bold">D</span>
            DashWin
          </span>
          <p className="text-[#4c4480] mt-3 leading-relaxed">Win the pipeline before lunch.</p>
        </div>
        {[
          { h: "Product", l: ["How it works", "Pricing", "Sign in"] },
          { h: "Solutions", l: ["Dental clinics", "Salons & spas", "Real estate"] },
          { h: "Resources", l: ["Get a demo", "Contact us", "Support login"] },
        ].map((c) => (
          <div key={c.h}>
            <p className="text-xs font-bold uppercase tracking-widest text-[#a099b4]">{c.h}</p>
            <ul className="mt-3 space-y-2">
              {c.l.map((l) => (
                <li key={l}><Link href="/login" className="text-[#4c4480] hover:text-[#120044]">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </footer>
    </div>
  );
}
