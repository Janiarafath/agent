"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { DashWinLogo } from "@/components/Logo";
import {
  ArrowRight, Play, Search, ShieldCheck, MessageSquare, Calendar,
  Stethoscope, Scissors, Home, Wrench, GraduationCap, UtensilsCrossed,
  Check, Moon, Ban, Menu, X, Zap, Clock, Rocket, Smartphone,
} from "lucide-react";

const rise = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: "easeOut" as const } }),
};

const BLUE = "#2E4BFF";

function HeroPhone() {
  const msgs = [
    { id: "h1", me: false, text: "Root canal cost?", delay: "0.4s" },
    { id: "h2", me: false, text: "Anyone there??", delay: "1.6s" },
    { id: "h3", me: true, text: "Starts ₹4,999. Book Friday 2 PM?", delay: "3.2s" },
    { id: "h4", me: false, text: "Yes, book it!", delay: "5s" },
    { id: "h5", me: true, text: "🔥 Booked + Zoom link sent", delay: "6.4s", hot: true },
  ];
  return (
    <div className="bg-[#101018] border border-white/15 rounded-[2rem] p-5 w-full max-w-sm mx-auto shadow-2xl shadow-blue-900/40">
      <p className="text-[11px] text-white/50 mb-3 text-center font-semibold">11:47 PM · WhatsApp · you are asleep</p>
      <div className="space-y-2.5 text-sm min-h-[300px]">
        {msgs.map((m) => (
          <p
            key={m.id}
            className={`chat-msg px-3.5 py-2.5 w-max max-w-[88%] font-medium ${
              m.hot
                ? "bg-emerald-500 text-white font-bold rounded-xl ml-auto text-[13px]"
                : m.me
                  ? "rounded-xl rounded-tr-sm ml-auto text-white"
                  : "bg-white/10 text-white rounded-xl rounded-tl-sm"
            }`}
            style={{ animationDelay: m.delay, ...(m.me && !m.hot ? { background: BLUE } : {}) }}
          >
            {m.text}
          </p>
        ))}
      </div>
      <p className="text-[11px] text-white/40 mt-3 text-center">Live demo loop · real DashWin flow</p>
    </div>
  );
}

const TABS = [
  {
    id: "find", label: "Find leads", icon: Search,
    title: "Type who you want. DashWin finds them.",
    desc: "“Dentists in Chennai” → real businesses with real numbers, pulled from maps and the open web. No CSVs, no scraping tools, no manual lists.",
    stat: "128", statLabel: "leads from one search",
  },
  {
    id: "verify", label: "Verify", icon: ShieldCheck,
    title: "Every number checked before a word goes out.",
    desc: "Dead numbers are dropped silently. You only ever pay attention to people who can actually receive your message.",
    stat: "100%", statLabel: "of sends to live numbers",
  },
  {
    id: "reply", label: "AI replies", icon: MessageSquare,
    title: "Answers from YOUR price card. Never invents.",
    desc: "You set services and prices once. The AI replies in seconds, only from what you wrote. Empty price = it never quotes.",
    stat: "~60s", statLabel: "first reply, day or night",
  },
  {
    id: "book", label: "Books", icon: Calendar,
    title: "Hot leads get a meeting link. You get a ping.",
    desc: "When someone says yes, DashWin books a Zoom slot and pings your phone. You wake up to a calendar, not a missed chat.",
    stat: "24/7", statLabel: "booking while you sleep",
  },
];

const BIZ = [
  { icon: Stethoscope, label: "Dental clinics" },
  { icon: Scissors, label: "Salons & spas" },
  { icon: Home, label: "Real estate" },
  { icon: Wrench, label: "Repair shops" },
  { icon: GraduationCap, label: "Coaching" },
  { icon: UtensilsCrossed, label: "Restaurants" },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState("find");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="font-sans text-slate-900 selection:bg-blue-200 bg-white">

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between text-white">
          <Link href="/" aria-label="DashWin home">
            <DashWinLogo dark size={30} />
          </Link>
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-white/80">
            <Link href="#how" className="hover:text-white transition-colors">How it works</Link>
            <Link href="#example" className="hover:text-white transition-colors">Live example</Link>
            <Link href="#safety" className="hover:text-white transition-colors">Safety</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </nav>
          <div className="hidden sm:flex items-center gap-5 text-sm font-medium">
            <Link href="/login" className="text-white/80 hover:text-white transition-colors">Sign in</Link>
            <Link href="/login" className="font-semibold px-5 py-2.5 rounded-lg transition-colors" style={{ background: BLUE }}>
              Start free
            </Link>
          </div>
          <button
            className="sm:hidden p-2 -mr-2 text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="sm:hidden bg-black border-t border-white/10 px-4 py-4 space-y-1 text-white">
            {[["How it works", "#how"], ["Live example", "#example"], ["Safety", "#safety"], ["Pricing", "/pricing"], ["Sign in", "/login"]].map(([label, href]) => (
              <Link key={href + label} href={href} onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm font-medium text-white/85">
                {label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-center font-semibold px-5 py-3 rounded-lg mt-2" style={{ background: BLUE }}>
              Start free
            </Link>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="bg-[#050505] text-white pt-28 md:pt-40 pb-16 md:pb-24 relative overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[420px] rounded-full blur-[140px] pointer-events-none" style={{ background: `${BLUE}33` }} />
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 relative grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <motion.h1 variants={rise} initial="hidden" animate="show" custom={1}
              className="text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.08] mb-5">
              Missed chats are costing you sales.{" "}
              <span className="bg-gradient-to-r from-[#7A8FFF] via-[#2E4BFF] to-[#22d3ee] bg-clip-text text-transparent">
                DashWin answers every one.
              </span>
            </motion.h1>
            <motion.p variants={rise} initial="hidden" animate="show" custom={2}
              className="text-base md:text-lg text-white/65 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              DashWin finds leads, replies on WhatsApp in seconds, follows up, and books
              meetings into your calendar — while you run your shop.
            </motion.p>
            <motion.div variants={rise} initial="hidden" animate="show" custom={3}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 mb-8">
              <Link href="/login" className="font-semibold px-8 py-3.5 rounded-lg text-center transition-opacity hover:opacity-90" style={{ background: BLUE }}>
                Start free
              </Link>
              <Link href="#watch" className="border border-white/25 bg-white/5 hover:bg-white/10 px-8 py-3.5 rounded-lg font-semibold text-center transition-colors inline-flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Watch 1-min video
              </Link>
            </motion.div>
            <motion.div variants={rise} initial="hidden" animate="show" custom={4}
              className="flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-[13px] text-white/55 font-medium">
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> No sales team needed</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> Runs on YOUR number — no new SIM</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> You approve every send</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> Works while you sleep</span>
            </motion.div>
          </div>
          <motion.div variants={rise} initial="hidden" animate="show" custom={2} className="relative lg:px-2">
            <div className="transition-transform duration-300 hover:scale-[1.02]">
              <HeroPhone />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4 max-w-sm mx-auto">
              <div className="bg-white text-slate-900 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <p className="text-xs font-bold leading-snug">HOT LEAD booked + Zoom link sent to your phone</p>
              </div>
              <div className="text-white rounded-xl shadow-2xl px-4 py-3" style={{ background: BLUE }}>
                <p className="text-2xl font-bold">~60s</p>
                <p className="text-xs font-semibold opacity-90">First reply, asleep or not</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* OUTCOMES MARQUEE */}
      <div className="bg-[#050505] border-y border-white/10 overflow-hidden py-4">
        <div className="flex whitespace-nowrap animate-marquee gap-10 text-sm font-semibold text-white/70 w-max">
          {["🔥 HOT LEAD booked + Zoom link sent", "✓ Friday 2 PM · confirmed", "💬 Replied in 41 seconds", "📅 3 meetings this week", "🌙 Sold while the owner slept", "🔥 HOT LEAD booked + Zoom link sent", "✓ Friday 2 PM · confirmed", "💬 Replied in 41 seconds", "📅 3 meetings this week", "🌙 Sold while the owner slept"].map((c, i) => (
            <span key={i} className="flex items-center gap-10">{c} <span style={{ color: BLUE }}>✦</span></span>
          ))}
        </div>
      </div>

      {/* WHO IT'S FOR */}
      <section className="bg-white border-b py-10 md:py-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-bold tracking-[0.18em] text-slate-400 uppercase mb-2">
            Made for local business — every kind
          </p>
          <p className="text-center text-sm text-slate-500 mb-6">If your customers text you, DashWin fits. Some friends already on board:</p>
          <div className="flex flex-wrap justify-center gap-2.5 md:gap-3">
            {BIZ.map((b) => (
              <div key={b.label} className="flex items-center gap-2 border border-slate-200 rounded-full px-4 py-2 text-sm font-semibold text-slate-600">
                <b.icon className="w-4 h-4" style={{ color: BLUE }} />
                {b.label}
              </div>
            ))}
            <div className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white" style={{ background: BLUE }}>
              + any business with customers
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-7 text-sm font-bold text-slate-900">
            <span><span className="tnum" style={{ color: BLUE }}>25/day</span> <span className="font-medium text-slate-500">guarded sends</span></span>
            <span><span className="tnum" style={{ color: BLUE }}>~60s</span> <span className="font-medium text-slate-500">first reply</span></span>
            <span><span className="tnum" style={{ color: BLUE }}>0</span> <span className="font-medium text-slate-500">placeholders ever sent</span></span>
          </div>
        </div>
      </section>

      {/* WHAT IT DOES — working tabs */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 text-slate-900">One helper. The whole job.</h2>
          <p className="text-center text-slate-500 mb-10 md:mb-14">Tap each step to see what DashWin does.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 mb-8">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-3 text-left transition-all ${
                  tab === t.id ? "bg-blue-50/60" : "border-transparent hover:bg-slate-50"
                }`}
                style={tab === t.id ? { borderColor: BLUE } : {}}
              >
                <span className="p-2 rounded-lg text-white shrink-0" style={{ background: tab === t.id ? BLUE : "#cbd5e1" }}>
                  <t.icon className="w-4 h-4" />
                </span>
                <span className={`text-sm font-bold ${tab === t.id ? "text-slate-900" : "text-slate-500"}`}>{t.label}</span>
              </button>
            ))}
          </div>
          <div key={active.id} className="grid md:grid-cols-2 gap-6 items-stretch bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-10">
            <div className="flex flex-col justify-center">
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">{active.title}</h3>
              <p className="text-slate-600 leading-relaxed mb-6">{active.desc}</p>
              <Link href="/login" className="inline-flex items-center gap-2 font-bold text-sm w-max" style={{ color: BLUE }}>
                Try it on your business <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="rounded-xl text-white p-8 flex flex-col items-center justify-center text-center min-h-[220px]" style={{ background: "#0B0B14" }}>
              <p className="tnum text-6xl font-bold" style={{ color: "#7A8FFF" }}>{active.stat}</p>
              <p className="text-white/60 font-medium mt-2">{active.statLabel}</p>
              <active.icon className="w-8 h-8 mt-5 text-white/30" />
            </div>
          </div>
        </div>
      </section>

      {/* LIVE EXAMPLE */}
      <section id="example" className="bg-[#050505] py-16 md:py-24 text-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] uppercase mb-4" style={{ color: "#7A8FFF" }}>A real night with DashWin</p>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-5">
              11:47 PM. Customer texts. Owner asleep. Sale saved.
            </h2>
            <p className="text-white/60 text-base md:text-lg mb-7 leading-relaxed">
              “Root canal cost?” → answered from <em className="text-white not-italic font-semibold">your</em> price
              card → Friday 2 PM booked → HOT LEAD ping on your phone. You wake up to a calendar, not a missed chat.
            </p>
            <Link href="/login" className="font-bold inline-flex items-center gap-2" style={{ color: "#7A8FFF" }}>
              Run this tonight <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div>
            <div className="bg-white/[0.07] border border-white/15 rounded-2xl p-5 max-w-sm mx-auto">
              <p className="text-[11px] text-white/50 mb-3 text-center font-semibold">11:47 PM · WhatsApp</p>
              <div className="space-y-2.5 text-sm">
                <p className="bg-white/10 rounded-xl rounded-tl-sm px-3.5 py-2 w-max max-w-[85%]">root canal cost??</p>
                <p className="bg-white/10 rounded-xl rounded-tl-sm px-3.5 py-2 w-max max-w-[85%]">anyone there??</p>
                <p className="rounded-xl rounded-tr-sm px-3.5 py-2 w-max max-w-[85%] ml-auto text-white font-medium" style={{ background: BLUE }}>Starts ₹4,999. Book Friday 2 PM?</p>
                <p className="bg-white/10 rounded-xl rounded-tl-sm px-3.5 py-2 w-max max-w-[85%]">yes, book it!</p>
                <p className="bg-emerald-500 rounded-xl px-3.5 py-2 text-[13px] font-bold text-white">🔥 HOT LEAD booked + Zoom link sent</p>
              </div>
            </div>
            <div className="max-w-sm mx-auto mt-4 bg-white text-slate-900 p-5 rounded-xl border-l-4" style={{ borderColor: BLUE }}>
              <p className="text-3xl font-bold" style={{ color: BLUE }}>~60s</p>
              <p className="text-sm font-bold">First reply, asleep or not</p>
              <p className="text-xs text-slate-500 mt-1">No missed chats. No lost customers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-16 md:py-24 bg-slate-50 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">Live in three steps.</h2>
          <p className="text-center text-slate-500 mb-10 md:mb-14">About five minutes of setup. Then it works while you sleep.</p>
          <div className="grid md:grid-cols-3 gap-4 md:gap-5">
            {[
              { n: "1", t: "Launch a search", d: "Type who you want — “salons in Kochi”. DashWin finds real businesses and checks every number.", icon: Search },
              { n: "2", t: "Approve the drafts", d: "The AI writes each first message from your services and prices. Nothing sends without your tap.", icon: Check },
              { n: "3", t: "Wake up to bookings", d: "Replies, follow-ups and meeting links happen on their own. Hot leads ping your phone.", icon: Rocket },
            ].map((s) => (
              <div key={s.n} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-9 h-9 rounded-lg text-white font-bold flex items-center justify-center" style={{ background: BLUE }}>{s.n}</span>
                  <s.icon className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">{s.t}</h3>
                <p className="text-slate-600 text-[15px] leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/login" className="inline-block text-white font-semibold px-8 py-3.5 rounded-lg" style={{ background: BLUE }}>
              Start step 1 — it&apos;s free
            </Link>
          </div>
        </div>
      </section>

      {/* WATCH */}
      <section id="watch" className="py-16 md:py-24 bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-5 gap-8 items-center rounded-2xl p-6 md:p-12 text-white" style={{ background: "#0B0B14" }}>
          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#7A8FFF" }}>Launch film · 1:01</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mt-2">Watch a customer get won while the owner sleeps.</h2>
            <p className="text-white/60 mt-3 leading-relaxed text-[15px]">Late-night question, instant answer from the price card, Friday booking, HOT LEAD ping. Narrated start to finish.</p>
            <Link href="/login" className="inline-flex items-center gap-2 mt-6 text-white font-semibold px-6 py-3 rounded-lg text-sm" style={{ background: BLUE }}>
              Try it live <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="lg:col-span-3">
            <video className="w-full rounded-xl border border-white/15" controls preload="none" poster="/dashwin-poster.jpg" src="/dashwin-launch.mp4" />
          </div>
        </div>
      </section>

      {/* SAFETY */}
      <section id="safety" className="py-16 md:py-24 bg-slate-50 border-t scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">Powerful, but polite.</h2>
          <p className="text-center text-slate-500 mb-10 md:mb-14">Four rules the AI can never break.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[
              { icon: Smartphone, title: "Your number, not a new one", desc: "No new SIM, no new phone. DashWin links your existing WhatsApp in one scan and sends as you." },
              { icon: Check, title: "You approve every send", desc: "First messages wait in your review queue. The AI never sends behind your back." },
              { icon: Ban, title: "STOP means instant block", desc: "Anyone who opts out is blocked across every language we detect. Forever." },
              { icon: Moon, title: "Capped so you stay safe", desc: "Max 25 sends a day per number — paced like a human, so WhatsApp stays happy." },
            ].map((c) => (
              <div key={c.title} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${BLUE}14` }}>
                  <c.icon className="w-6 h-6" style={{ color: BLUE }} />
                </div>
                <h3 className="text-lg font-bold mb-2">{c.title}</h3>
                <p className="text-slate-600 text-[15px] leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-10 text-sm text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> Works 24/7</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Numbers verified first</span>
            <span className="inline-flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> Never invents prices</span>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-black py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-2xl p-8 md:p-14 text-center border border-white/10 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0B0B14 0%, #141033 55%, #0B0B14 100%)" }}>
            <div className="absolute -top-24 -left-16 w-80 h-80 rounded-full blur-[110px] pointer-events-none animate-drift-a" style={{ background: `${BLUE}55` }} />
            <div className="absolute -bottom-28 -right-16 w-80 h-80 rounded-full bg-fuchsia-600/25 blur-[120px] pointer-events-none animate-drift-b" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-px" style={{ background: "linear-gradient(90deg, transparent, #2E4BFF, transparent)" }} />
            <div className="flex justify-center mb-6 relative">
              <p className="text-xs font-bold tracking-[0.22em] uppercase text-white/50">Win your first customer with us</p>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-3 relative tracking-tight">Meet DashWin.</h2>
            <p className="text-white/60 mb-8 relative text-base md:text-lg">Less manual work. Fewer missed leads. More opportunities.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 relative">
              <Link href="/login" className="text-white font-semibold px-8 py-3.5 rounded-lg text-center" style={{ background: BLUE }}>
                Join the launch — free
              </Link>
              <Link href="#watch" className="border border-white/25 text-white hover:bg-white/10 px-8 py-3.5 rounded-lg font-semibold text-center transition-colors">
                Watch the film
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black text-white pt-14 pb-8 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <DashWinLogo dark size={30} />
            <p className="text-sm text-white/50 mt-4 leading-relaxed">WhatsApp AI that turns chats into customers for local business.</p>
          </div>
          <div>
            <h4 className="font-bold mb-5">Product</h4>
            <ul className="space-y-3 text-sm text-white/55">
              <li><Link href="#how" className="hover:text-white transition-colors">How it works</Link></li>
              <li><Link href="#example" className="hover:text-white transition-colors">Live example</Link></li>
              <li><Link href="#safety" className="hover:text-white transition-colors">Safety</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-5">Best for</h4>
            <ul className="space-y-3 text-sm text-white/55">
              <li>Clinics & salons</li>
              <li>Shops & services</li>
              <li>Realtors & coaches</li>
              <li>Any business with customers</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-5">Get started</h4>
            <ul className="space-y-3 text-sm text-white/55">
              <li><Link href="/login" className="hover:text-white transition-colors">Sign in</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Start free</Link></li>
              <li><Link href="#watch" className="hover:text-white transition-colors">Watch the film</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/40">
          <p>© 2026 DashWin. Your next sale starts here.</p>
          <p>Less work · No missed leads · More sales</p>
        </div>
      </footer>

    </div>
  );
}
