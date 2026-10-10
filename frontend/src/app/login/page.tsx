"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { DashWinLogo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Login() {
  const { user, loginWithEmail, registerWithEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) await loginWithEmail(email, password);
      else await registerWithEmail(email, password);
      router.replace("/dashboard");
    } catch (err: any) {
      alert(err.message);
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
        <p className="text-xs text-white/40">Free trial · No credit card</p>
      </div>
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="md:hidden mb-6 w-max">
            <DashWinLogo />
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-[#0B0B14]">{isLogin ? "Welcome back" : "Create account"}</h2>
          <p className="text-sm text-[#4c4480] mt-1 mb-6">{isLogin ? "Sign in to your sales engine." : "Start winning pipelines today."}</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#4c4480] mb-1">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-white border border-[#e4e1f5] rounded px-4 py-2.5 text-[#0B0B14] focus:outline-none focus:ring-2 focus:ring-[#2E4BFF]/30 focus:border-[#2E4BFF]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4c4480] mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-white border border-[#e4e1f5] rounded px-4 py-2.5 text-[#0B0B14] focus:outline-none focus:ring-2 focus:ring-[#2E4BFF]/30 focus:border-[#2E4BFF]" />
            </div>
            <button type="submit" className="ui-press w-full bg-[#2E4BFF] hover:bg-[#1D33D6] text-white font-semibold py-2.5 rounded">
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>
          <p className="text-center mt-5 text-sm text-[#4c4480]">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-semibold text-[#2E4BFF] hover:text-[#1D33D6]">
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
          <p className="text-center mt-4 text-xs">
            <Link href="/" className="text-[#a099b4] hover:text-[#0B0B14]">← Back to site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
