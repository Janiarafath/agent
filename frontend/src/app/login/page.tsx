"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, CheckCircle2 } from "lucide-react";
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
      <div className="hidden md:flex w-[44%] flex-col justify-between p-12 bg-[#120044] text-white">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-7 h-7 bg-[#5951ff] rounded flex items-center justify-center text-white text-sm font-bold">D</span>
          <span className="font-bold text-lg tracking-tight">DashWin</span>
        </Link>
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">Your pipeline,<br />warming itself up.</h1>
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
          <Link href="/" className="md:hidden flex items-center gap-2 mb-6">
            <span className="w-7 h-7 bg-[#5951ff] rounded flex items-center justify-center text-white text-sm font-bold">D</span>
            <span className="font-bold text-[#120044]">DashWin</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-[#120044]">{isLogin ? "Welcome back" : "Create account"}</h2>
          <p className="text-sm text-[#4c4480] mt-1 mb-6">{isLogin ? "Sign in to your sales engine." : "Start winning pipelines today."}</p>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#4c4480] mb-1">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-white border border-[#e4e1f5] rounded px-4 py-2.5 text-[#120044] focus:outline-none focus:ring-2 focus:ring-[#5951ff]/30 focus:border-[#5951ff]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4c4480] mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-white border border-[#e4e1f5] rounded px-4 py-2.5 text-[#120044] focus:outline-none focus:ring-2 focus:ring-[#5951ff]/30 focus:border-[#5951ff]" />
            </div>
            <button type="submit" className="ui-press w-full bg-[#5951ff] hover:bg-[#4640e0] text-white font-semibold py-2.5 rounded">
              {isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>
          <p className="text-center mt-5 text-sm text-[#4c4480]">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-semibold text-[#5951ff] hover:text-[#4640e0]">
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
          <p className="text-center mt-4 text-xs">
            <Link href="/" className="text-[#a099b4] hover:text-[#120044]">← Back to site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
