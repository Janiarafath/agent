"use client";

import Link from "next/link";
import { CheckCircle2, X } from "lucide-react";
import { DashWinLogo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

export default function Pricing() {
  const { user } = useAuth();
  
  return (
    <div className="hero bg-[#0a0e1a] min-h-screen text-white font-sans pt-20 relative overflow-hidden">
      
      {/* Simple Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/70 backdrop-blur-md border-b border-[rgba(255,255,255,0.08)]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <DashWinLogo dark size={30} />
          </Link>
          <Link href="/" className="text-[15px] font-semibold text-[#94a3b8] hover:text-white flex items-center gap-2 transition-colors">
            <X className="w-5 h-5" /> Close
          </Link>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            Simple pricing for local business
          </h1>
          <p className="text-lg text-[#94a3b8]">
            Look around free. Pay only when DashWin sends and earns.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {[
            {
              name: "Free",
              desc: "Look around. No sending.",
              price: "₹0",
              period: "forever",
              features: [
                "Find + verify leads",
                "0 sends / day",
                "0 AI replies / day",
                "Live pipeline view",
              ],
              cta: "Start free",
              primary: false
            },
            {
              name: "Starter",
              desc: "Your first sales helper.",
              price: "₹299",
              period: "per month",
              features: [
                "25 sends / day",
                "200 AI replies / day",
                "Auto follow-ups",
                "Zoom meeting links",
                "HOT LEAD pings",
              ],
              cta: "Pick Starter",
              primary: true
            },
            {
              name: "Growth",
              desc: "Shops doing real volume.",
              price: "₹599",
              period: "per month",
              features: [
                "Everything in Starter",
                "600 sends / day",
                "3,000 AI replies / day",
                "Recovery queue",
              ],
              cta: "Pick Growth",
              primary: false
            },
            {
              name: "Pro",
              desc: "Chains and power sellers.",
              price: "₹999",
              period: "per month",
              features: [
                "Everything in Growth",
                "2,000 sends / day",
                "10,000 AI replies / day",
                "Priority support",
              ],
              cta: "Pick Pro",
              primary: false
            },
          ].map((plan, i) => (
            <div key={i} className={`glass-panel p-8 flex flex-col relative transition-all ${
              plan.primary ? "border-[#3b82f6] shadow-2xl shadow-[#3b82f6]/20 transform md:-translate-y-4 bg-[rgba(30,41,59,0.8)]" : ""
            }`}>
              {plan.primary && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#3b82f6] text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg">
                  Most Popular
                </div>
              )}
              
              <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
              <p className="text-[#94a3b8] text-sm h-10 mb-6">{plan.desc}</p>
              
              <div className="mb-8">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-[#94a3b8] ml-2 text-sm">{plan.period}</span>
              </div>
              
              <Link href={user ? "/dashboard" : "/login"} className={`ui-press w-full py-3 rounded-md text-center font-semibold mb-8 transition-all ${
                plan.primary ? "bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-lg shadow-[#3b82f6]/25" : "bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)]"
              }`}>
                {plan.cta}
              </Link>
              
              <div className="flex-grow">
                <p className="text-xs font-bold text-[#a78bfa] mb-4 uppercase tracking-wider">What's included</p>
                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-[#94a3b8]">
                      <CheckCircle2 className="w-5 h-5 text-[#3b82f6] shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
