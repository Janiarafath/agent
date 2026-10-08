"use client";

import Link from "next/link";
import { ArrowRight, Play, Check, Search, ShieldCheck, Zap, Mail, Calendar, TrendingUp, Users, Activity, Lock, Database, Globe, ChevronRight, ChevronLeft, MessageSquare } from "lucide-react";

export default function Landing() {
  return (
    <div className="font-sans text-slate-900 selection:bg-indigo-200">
      
      {/* NAVBAR */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between text-white">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded bg-[#5951FF] flex items-center justify-center font-bold text-sm">D</span>
            <span className="font-bold text-xl tracking-tight">DashWin</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
            <Link href="#" className="hover:text-indigo-200 transition-colors">Platform</Link>
            <Link href="#" className="hover:text-indigo-200 transition-colors">Solutions</Link>
            <Link href="#" className="hover:text-indigo-200 transition-colors">Customers</Link>
            <Link href="#" className="hover:text-indigo-200 transition-colors">Resources</Link>
            <Link href="/pricing" className="hover:text-indigo-200 transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/login" className="hover:text-indigo-200 transition-colors hidden sm:block">Sign in</Link>
            <Link href="/login" className="bg-[#5951FF] hover:bg-indigo-600 px-6 py-2.5 rounded-sm transition-colors">
              Get a demo
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className="hero-outreach w-full pt-40 pb-32 relative text-center text-white border-b-4 border-indigo-500/20">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <p className="text-xs font-bold tracking-[0.2em] text-amber-200/90 uppercase mb-6">
            Agentic AI for Revenue Teams
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            You didn't hire enough sellers. Now you don't have to.
          </h1>
          <p className="text-lg md:text-xl text-indigo-100/80 mb-10 max-w-2xl mx-auto leading-relaxed">
            Automate pipeline generation, draft hyper-personalized outreach, and manage your deals with DashWin's AI-native revenue platform.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link href="/login" className="bg-[#5951FF] hover:bg-indigo-600 px-8 py-3.5 rounded-sm font-medium transition-colors">
              Get a demo
            </Link>
            <Link href="#tour" className="border border-white/30 hover:bg-white/10 px-8 py-3.5 rounded-sm font-medium transition-colors">
              Take a product tour
            </Link>
          </div>
          <p className="text-sm font-medium text-indigo-200/60 uppercase tracking-wider">
            Trusted by 6,000+ Top Revenue Teams Worldwide
          </p>
        </div>
      </section>

      {/* 2. INNOVATION HIGHLIGHTS */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-[#05001A]">New Agentic AI Innovation Highlights</h2>
          
          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {[
              { icon: <Search className="w-5 h-5" />, label: "Discover Leads", active: true },
              { icon: <Mail className="w-5 h-5" />, label: "Smart Draft" },
              { icon: <Check className="w-5 h-5" />, label: "Verify Numbers" },
              { icon: <MessageSquare className="w-5 h-5" />, label: "WhatsApp AI" },
              { icon: <Activity className="w-5 h-5" />, label: "Pipeline Sync" },
              { icon: <Calendar className="w-5 h-5" />, label: "Auto-Booking" }
            ].map((tab, i) => (
              <button key={i} className={`flex flex-col items-center justify-center w-28 h-24 rounded-lg border-2 transition-all ${tab.active ? 'border-[#5951FF] bg-[#5951FF]/5 text-[#5951FF]' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                <div className={`mb-2 p-2 rounded-md ${tab.active ? 'bg-[#5951FF] text-white' : 'bg-slate-100'}`}>
                  {tab.icon}
                </div>
                <span className="text-xs font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex flex-col lg:flex-row items-center gap-12 bg-slate-50 border rounded-2xl p-8">
            <div className="w-full lg:w-3/5">
              <div className="aspect-video bg-white rounded-xl shadow-lg border p-1 relative overflow-hidden group cursor-pointer">
                <img src="https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover rounded-lg opacity-90 group-hover:opacity-100 transition-opacity" alt="Demo Video" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 text-[#5951FF] ml-1" />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-2/5 space-y-6">
              <h3 className="text-2xl font-bold text-[#05001A]">DashWin ICP</h3>
              <p className="text-slate-600 leading-relaxed">
                Define your perfect customer and let DashWin's Agentic AI find them across the web. Automatically verify their WhatsApp numbers and draft hyper-personalized sequences to maximize engagement.
              </p>
              <button className="bg-[#5951FF] hover:bg-indigo-600 text-white px-6 py-2.5 rounded-sm font-medium transition-colors">
                Read the release notes
              </button>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link href="#" className="text-[#5951FF] font-semibold hover:underline">
              See all DashWin Agentic AI capabilities →
            </Link>
          </div>
        </div>
      </section>

      {/* 3. TESTIMONIAL BAR */}
      <section className="bg-[#5951FF] py-10 text-white">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Keri Malin" className="w-16 h-16 rounded-full border-2 border-white/20" />
            <div>
              <p className="text-lg font-semibold">Keri Malin</p>
              <p className="text-sm text-white/80 mb-2">SVP of Sales, TechCorp</p>
              <p className="font-medium">"DashWin generated 10x ROI in 3 months and completely filled our reps' calendars."</p>
            </div>
          </div>
          <button className="bg-white text-[#5951FF] hover:bg-indigo-50 px-6 py-2.5 rounded-sm font-medium transition-colors whitespace-nowrap">
            Read the story
          </button>
        </div>
      </section>

      {/* 4. CUSTOMER STORY (Dark Navy) */}
      <section className="bg-[#0A0033] py-24 text-white">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[#5951FF] text-sm font-bold tracking-widest uppercase mb-4">Customer Story</p>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Amplitude reduced their tech stack and saved big.
            </h2>
            <p className="text-indigo-200/80 text-lg mb-8">
              "By consolidating on DashWin, we provided a single source of truth for our reps and saved over $500k in software licenses."
            </p>
            <Link href="#" className="text-[#5951FF] font-semibold hover:underline flex items-center gap-2">
              Read the Amplitude story <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="relative">
            <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32d7?auto=format&fit=crop&w=800&q=80" alt="Team meeting" className="rounded-sm shadow-2xl" />
            <div className="absolute -bottom-8 -right-8 bg-white text-slate-900 p-6 rounded-sm shadow-xl w-64 border-l-4 border-[#5951FF]">
              <p className="text-3xl font-bold text-[#5951FF] mb-1">$500k+</p>
              <p className="text-sm font-bold mb-2">Saved in 1 Year</p>
              <p className="text-xs text-slate-500">By replacing point solutions with DashWin's unified platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. G2 CAROUSEL (Darker Navy) */}
      <section className="bg-[#03001C] py-24 text-center border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 relative">
          <div className="mb-8 flex justify-center">
            <div className="bg-orange-500 text-white font-bold text-2xl px-4 py-1 rounded">G2</div>
          </div>
          <button className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#5951FF] flex items-center justify-center rounded hover:bg-indigo-600 transition-colors">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#5951FF] flex items-center justify-center rounded hover:bg-indigo-600 transition-colors">
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
          
          <div className="px-16">
            <p className="text-2xl md:text-3xl font-medium text-white mb-8 leading-snug">
              "If you want to be effective... you use DashWin to manage the entire pipeline from finding leads to booking meetings."
            </p>
            <p className="text-sm text-white/60 mb-1">Director of Sales</p>
            <p className="text-xs text-white/40 mb-6">Mid-Market Company</p>
            <Link href="#" className="text-[#5951FF] text-sm font-semibold hover:underline">
              Read the full report
            </Link>
          </div>
          
          <div className="flex justify-center gap-2 mt-12">
            <div className="w-2 h-2 rounded-full bg-[#5951FF]"></div>
            <div className="w-2 h-2 rounded-full bg-white/20"></div>
            <div className="w-2 h-2 rounded-full bg-white/20"></div>
          </div>
        </div>
      </section>

      {/* 6. CTA BANNER */}
      <section className="bg-[#05001A] py-16 text-center border-b border-white/10">
         <p className="text-lg text-white font-medium mb-1">after your sellers are out of the building on Friday, DashWin keeps working. <span className="text-[#5951FF]">Generate pipeline 24/7.</span></p>
         <div className="flex justify-center gap-4 mt-6">
            <button className="bg-[#5951FF] hover:bg-indigo-600 text-white px-6 py-2.5 rounded-sm font-medium transition-colors">Start for free</button>
            <button className="bg-transparent border border-white/30 text-white hover:bg-white/10 px-6 py-2.5 rounded-sm font-medium transition-colors">Get a demo</button>
         </div>
      </section>

      {/* 7. CAPABILITIES / PLATFORM DIAGRAM */}
      <section className="py-24 bg-white">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#05001A] mb-4">One agentic AI platform for revenue teams.</h2>
            <p className="text-lg text-slate-600">Upgrade from manual execution to AI agent execution.</p>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            {/* Left list */}
            <div className="w-full lg:w-1/3 space-y-4">
              <div className="p-5 border-l-4 border-[#5951FF] bg-slate-50 shadow-sm rounded-r-md">
                <div className="flex items-center gap-3 font-bold text-[#05001A] mb-2">
                  <div className="w-6 h-6 rounded bg-[#5951FF] text-white flex items-center justify-center text-xs">1</div>
                  Automated Pipeline Generation
                </div>
                <p className="text-sm text-slate-600 ml-9">Find exact ICP matches across the web and verify their contact details instantly.</p>
              </div>
              {[
                { n: 2, title: "Contextual AI Outreach" },
                { n: 3, title: "WhatsApp AI Agent" },
                { n: 4, title: "Smart Meeting Booker" },
                { n: 5, title: "Full CRM Synchronization" },
                { n: 6, title: "Revenue Analytics" }
              ].map(item => (
                <div key={item.n} className="p-5 border-l-4 border-transparent hover:bg-slate-50 transition-colors cursor-pointer rounded-r-md">
                  <div className="flex items-center gap-3 font-semibold text-slate-500 hover:text-[#05001A]">
                    <div className="w-6 h-6 rounded border-2 border-slate-300 flex items-center justify-center text-xs">{item.n}</div>
                    {item.title}
                  </div>
                </div>
              ))}
              <div className="pt-4 pl-9">
                <button className="bg-[#5951FF] hover:bg-indigo-600 text-white px-6 py-2.5 rounded-sm font-medium transition-colors w-full sm:w-auto">
                  Explore the platform
                </button>
              </div>
            </div>
            
            {/* Right Diagram Placeholder */}
            <div className="w-full lg:w-2/3">
              <div className="bg-slate-100 rounded-xl p-8 border shadow-inner flex items-center justify-center aspect-[16/10]">
                 <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80" alt="Platform Diagram" className="rounded shadow-xl object-cover h-full w-full opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7b. WATCH IT WORK */}
      <section className="py-24 bg-white border-t">
        <div className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-5 gap-10 items-center bg-[#120044] rounded-sm p-8 md:p-12">
          <div className="md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#5951FF]">Launch cut · 0:20</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-2">Watch a customer get won while the owner sleeps.</h2>
            <p className="text-white/70 mt-3 leading-relaxed">Real product flow: late-night question, instant grounded answer, Friday booking, HOT LEAD ping.</p>
            <Link href="/login" className="inline-flex items-center gap-2 mt-6 bg-[#5951FF] hover:bg-indigo-600 text-white font-semibold px-6 py-3 rounded-sm text-sm">
              Try it live <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="md:col-span-3">
            <video className="w-full rounded-sm border border-white/15" controls preload="none" poster="/dashwin-poster.jpg" src="/dashwin-launch.mp4" />
          </div>
        </div>
      </section>

      {/* 8. TRUST 3 CARDS */}
      <section className="py-24 bg-[#F8F9FA] border-t">
        <div className="max-w-[1400px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#05001A] mb-16">A Trusted Sales Platform</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Security", desc: "DashWin operates with SOC 2 Type II compliance and robust data encryption at every level.", icon: <ShieldCheck className="w-8 h-8 text-[#5951FF]" /> },
              { title: "Reliability", desc: "Built on enterprise-grade infrastructure with 99.99% guaranteed uptime for global teams.", icon: <Globe className="w-8 h-8 text-[#5951FF]" /> },
              { title: "Data Privacy", desc: "Full GDPR and CCPA compliance. Your proprietary sales data is never used to train global models.", icon: <Database className="w-8 h-8 text-[#5951FF]" /> }
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-lg p-8 shadow-sm border border-slate-100 flex flex-col h-full">
                <div className="bg-indigo-50 w-24 h-24 rounded-2xl flex items-center justify-center mb-8 self-center">
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold text-[#05001A] mb-4">{card.title}</h3>
                <p className="text-slate-600 mb-8 flex-grow">{card.desc}</p>
                <Link href="#" className="bg-[#5951FF]/10 text-[#5951FF] hover:bg-[#5951FF]/20 px-6 py-2.5 rounded-sm font-semibold transition-colors text-center w-max">
                  Learn more
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. PRE-FOOTER CTA */}
      <section className="bg-black py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#1A0B40] to-[#0A0033] rounded-2xl p-12 text-center border border-indigo-500/20 shadow-2xl shadow-indigo-900/20 relative overflow-hidden">
             {/* Decorative glow */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#5951FF] rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
             
             <div className="w-12 h-12 bg-[#5951FF] rounded-lg flex items-center justify-center mx-auto mb-6">
               <span className="text-white font-bold text-xl">D</span>
             </div>
             <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">DashWin Agentic AI Platform for Revenue Teams</h2>
             <p className="text-indigo-200/80 mb-10">Automate Pipeline Generation | Personalize Outreach | Close More Deals</p>
             <div className="flex flex-wrap justify-center gap-4 relative z-10">
                <button className="bg-[#5951FF] hover:bg-indigo-600 text-white px-8 py-3 rounded-sm font-medium transition-colors">Start for free</button>
                <button className="bg-transparent border border-white/30 text-white hover:bg-white/10 px-8 py-3 rounded-sm font-medium transition-colors">Get a demo</button>
             </div>
          </div>
        </div>
      </section>

      {/* 10. HUGE FOOTER */}
      <footer className="bg-black text-white pt-20 pb-10 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          <div>
            <h4 className="font-bold mb-6 text-lg">Platform</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link href="#" className="hover:text-white transition-colors">Agentic Discovery</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Smart Drafts</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">WhatsApp Verifier</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Pipeline Analytics</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Integrations</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-lg">Capabilities</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link href="#" className="hover:text-white transition-colors">Lead Generation</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Account Based Sales</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Sales Execution</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Revenue Intelligence</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Forecasting</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-lg">Sales Teams</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link href="#" className="hover:text-white transition-colors">SDRs & BDRs</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Account Executives</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Sales Leaders</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">RevOps</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Customer Success</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-lg">Company</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Newsroom</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Security</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-lg">Talk with us</h4>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
               <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-full bg-indigo-500"></div>
                 <div>
                   <p className="text-sm font-bold">Sales Chat</p>
                   <p className="text-xs text-green-400">Online</p>
                 </div>
               </div>
               <button className="w-full bg-[#5951FF] text-white text-xs font-bold py-2 rounded-sm hover:bg-indigo-600 transition-colors">Start a conversation</button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Have questions about pricing or custom enterprise plans? Our team is ready to help.
            </p>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-6 border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white">Privacy Policy</Link>
            <Link href="#" className="hover:text-white">Terms of Service</Link>
            <Link href="#" className="hover:text-white">Cookie Settings</Link>
          </div>
          <p>© 2026 DashWin Inc. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
