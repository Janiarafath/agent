"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, Sparkles, Send, CheckCircle2, SearchIcon, Clock, MessageSquare, Terminal, ChevronRight, Activity, Smartphone, Link2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface DashboardData {
  metrics: {
    total_leads: number;
    new: number;
    researching: number;
    outreach_ready: number;
    replied: number;
  };
  pipeline: {
    id: number;
    company_name: string;
    pipeline_state: string;
    business_signals: any;
    ai_muted: boolean;
  }[];
}

const API_BASE = "http://127.0.0.1:8000";
const WHATSAPP_API = "http://127.0.0.1:3001";

export default function Dashboard() {
  const { user, loginWithEmail, registerWithEmail } = useAuth();
  
  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  // App State
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTriggering, setIsTriggering] = useState(false);
  const [isFollowup, setIsFollowup] = useState(false);

  // WhatsApp State
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [waConnected, setWaConnected] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Meetings State (boss alerts: interest + agreed time + join link)
  const [meetings, setMeetings] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchDashboard = () => {
      fetch(`${API_BASE}/api/dashboard?user_id=${user.uid}`)
        .then((res) => res.json())
        .then((data) => { setData(data); setLoading(false); })
        .catch((err) => { setError(err.message); setLoading(false); });
      fetch(`${API_BASE}/api/meetings?user_id=${user.uid}`)
        .then((res) => res.json())
        .then((data) => { setMeetings(data.meetings || []); })
        .catch(() => {});
    };
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const checkWaStatus = async () => {
        try {
            const res = await fetch(`${WHATSAPP_API}/api/whatsapp/status?userId=${user.uid}`);
            const json = await res.json();
            setWaConnected(json.connected);
            if (json.qr && !json.connected) setQrCode(json.qr);
            if (json.connected) setShowQRModal(false);
        } catch (e) {}
    };
    checkWaStatus();
    const interval = setInterval(checkWaStatus, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (isLogin) {
            await loginWithEmail(email, password);
        } else {
            await registerWithEmail(email, password);
        }
    } catch (err: any) {
        alert(err.message);
    }
  };

  const triggerDiscovery = async () => {
    if (!user) return;
    setIsTriggering(true);
    try {
      const raw = (searchQuery || "dentists in Chennai, India").trim();
      // flexible parse: "dentists in Chennai", "dentist at chennai", "dentists chennai", "dentists"
      let category = raw, city = "Chennai, India";
      const m = raw.match(/(.+?)\s+(?:in|at|,)\s+(.+)/i);
      if (m) { category = m[1].trim(); city = m[2].trim(); }
      const res = await fetch(`${API_BASE}/api/discover`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, city, user_id: user.uid, max_results: 25 })
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      alert(`Discovery queued: ${category} in ${city}. Watch Review column in ~1-2 min.`);
    } catch (err: any) {
      alert(`Launch failed: ${err?.message || err}. Is backend on :8000?`);
    }
    setIsTriggering(false);
  };

  const triggerFollowups = async () => {
    if (!user) return;
    setIsFollowup(true);
    try { await fetch(`${API_BASE}/api/trigger-followups`, { method: "POST" }); } catch (err) {}
    setIsFollowup(false);
  };
  
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const approveOutreach = async (id: number) => {
    if (!user) return;
    if (!waConnected) { alert("Please connect WhatsApp first!"); setShowQRModal(true); return; }
    setApprovingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/approve/${id}?user_id=${user.uid}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || `Server ${res.status}`);
      alert("Sent!");
    } catch (err: any) {
      alert(`Not sent: ${err?.message || err}`);
    }
    setApprovingId(null);
  };

  if (!user) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* White Glassmorphism Background Blobs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
            
            <div className="relative z-10 w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">GrowthPilot AI</h1>
                    <p className="text-sm text-slate-500 mt-1">Autonomous Pipeline Engine</p>
                </div>
                
                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Email address</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98]">
                        {isLogin ? "Sign In" : "Create Account"}
                    </button>
                </form>
                
                <p className="text-center mt-6 text-sm text-slate-500">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-semibold text-indigo-600 hover:text-indigo-500">
                        {isLogin ? "Sign Up" : "Sign In"}
                    </button>
                </p>
            </div>
        </div>
    );
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs uppercase tracking-widest font-semibold text-slate-500">Initializing Engine...</p>
        </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
        
      {/* WhatsApp QR Modal (Light Theme) */}
      {showQRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md">
            <div className="bg-white/90 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-3xl p-8 max-w-sm w-full flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <Smartphone className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Connect WhatsApp</h3>
                <p className="text-sm text-slate-500 text-center mb-6">Scan this code with your WhatsApp mobile app to link your account as a sender.</p>
                
                {qrCode ? (
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                    </div>
                ) : (
                    <div className="w-48 h-48 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                )}
                
                <button onClick={() => setShowQRModal(false)} className="mt-6 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                    Cancel
                </button>
            </div>
        </div>
      )}

      {/* Header & Connectivity */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pipeline Overview</h1>
            <p className="text-sm text-slate-500 mt-1">Real-time metrics from your AI agent.</p>
        </div>
        <button 
            onClick={() => !waConnected && setShowQRModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm transition-all shadow-sm ${waConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'}`}
        >
            <Link2 className="w-4 h-4" />
            {waConnected ? 'WhatsApp Linked' : 'Link WhatsApp'}
        </button>
      </div>

      {/* Command Center */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Agent Targeting Directive</label>
                  <div className="relative group">
                      <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                      <input 
                          type="text" 
                          placeholder="E.g. Plumbers in Austin, Texas..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-white/80 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                      />
                  </div>
              </div>
              <div className="flex gap-3">
                  <button 
                      onClick={triggerFollowups}
                      disabled={isFollowup}
                      className="h-[46px] px-5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                      {isFollowup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4 text-slate-400" />}
                      Run Follow-ups
                  </button>
                  <button 
                      onClick={triggerDiscovery}
                      disabled={isTriggering}
                      className="h-[46px] px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                      {isTriggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Launch Campaign
                  </button>
              </div>
          </div>
      </div>
        
      {/* Telemetry Data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Found", value: data?.metrics.total_leads || 0, icon: SearchIcon, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Researching", value: data?.metrics.researching || 0, icon: Activity, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Ready to Send", value: data?.metrics.outreach_ready || 0, icon: Send, color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Replied", value: data?.metrics.replied || 0, icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-50" }
        ].map((stat, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300 cursor-default">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</h3>
            </div>
            <p className="text-4xl font-extrabold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>
        
      {/* Meetings Booked — boss alerts */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Meetings Booked 🔥</h2>
        <p className="text-sm text-slate-500 mb-4">Customers who showed interest and agreed to a time. Join link included.</p>
        {meetings.length === 0 ? (
          <p className="text-sm text-slate-400">No meetings yet — booked calls land here with company, time, interest + join link.</p>
        ) : (
          <div className="space-y-3">
            {meetings.map((m: any) => (
              <div key={m.id} className="bg-white p-4 rounded-xl border-l-4 border-l-emerald-500 border-y border-r border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{m.company}</p>
                    <p className="text-xs text-slate-500 mt-1">Agreed: <span className="font-semibold text-slate-700">{m.time}</span></p>
                    <p className="text-xs text-emerald-600 mt-1">{m.interest}</p>
                  </div>
                  <a href={m.link} target="_blank" rel="noreferrer" className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center">
                    Join Call
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline Interface */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 px-2">Pipeline State</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-[600px]">
          
          {/* Column 1: NEW */}
          <div className="flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200/50 p-2">
            <div className="p-2 mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Queue</span>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{data?.metrics.new || 0}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.NEW' || p.pipeline_state === 'NEW').map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative">
                  {p.ai_muted && <ShieldAlert className="absolute top-3 right-3 w-4 h-4 text-red-500" />}
                  <p className="text-sm font-bold text-slate-800 pr-5">{p.company_name}</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-2 truncate">SRC: {p.business_signals?.source || 'SYSTEM'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: RESEARCHING */}
          <div className="flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200/50 p-2">
            <div className="p-2 mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Researching</span>
                <span className="bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{data?.metrics.researching || 0}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.RESEARCHING' || p.pipeline_state === 'RESEARCHING').map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl border-l-4 border-l-amber-400 border-y border-r border-slate-100 shadow-sm relative">
                  {p.ai_muted && <ShieldAlert className="absolute top-3 right-3 w-4 h-4 text-red-500" />}
                  <p className="text-sm font-bold text-slate-800 pr-5">{p.company_name}</p>
                  <div className="mt-3 flex items-center gap-1.5 bg-amber-50 rounded-lg px-2 py-1.5 w-max">
                      <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                      <span className="text-[10px] font-bold text-amber-600">Scraping Web...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: OUTREACH READY */}
          <div className="flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200/50 p-2">
            <div className="p-2 mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Review</span>
                <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{data?.metrics.outreach_ready || 0}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.OUTREACH_READY' || p.pipeline_state === 'OUTREACH_READY').map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl border-l-4 border-l-purple-500 border-y border-r border-slate-100 shadow-sm relative">
                  {p.ai_muted && <ShieldAlert className="absolute top-3 right-3 w-4 h-4 text-red-500" />}
                  <p className="text-sm font-bold text-slate-800 pr-5">{p.company_name}</p>
                  <button 
                      onClick={() => approveOutreach(p.id)}
                      disabled={approvingId === p.id}
                      className="mt-3 w-full bg-purple-50 hover:bg-purple-100 disabled:opacity-50 text-purple-600 text-[11px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                      {approvingId === p.id ? "Sending..." : <>Approve <ChevronRight className="w-3 h-3" /></>}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Column 4: CONTACTED */}
          <div className="flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200/50 p-2">
            <div className="p-2 mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Awaiting</span>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">-</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.CONTACTED' || p.pipeline_state === 'CONTACTED').map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl border-l-4 border-l-slate-400 border-y border-r border-slate-100 shadow-sm relative">
                  {p.ai_muted && (
                      <div className="mb-3 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 flex items-center gap-1.5 w-max">
                          <ShieldAlert className="w-3 h-3 text-red-500" />
                          <span className="text-[10px] font-bold text-red-600">Human Muted</span>
                      </div>
                  )}
                  <p className="text-sm font-bold text-slate-800">{p.company_name}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase">Standby</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 5: REPLIED */}
          <div className="flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200/50 p-2">
            <div className="p-2 mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Success</span>
                <span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{data?.metrics.replied || 0}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.REPLIED' || p.pipeline_state === 'REPLIED').map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl border-l-4 border-l-emerald-500 border-y border-r border-slate-100 shadow-sm relative">
                  {p.ai_muted && (
                      <div className="mb-3 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 flex items-center gap-1.5 w-max">
                          <ShieldAlert className="w-3 h-3 text-red-500" />
                          <span className="text-[10px] font-bold text-red-600">Human Muted</span>
                      </div>
                  )}
                  <p className="text-sm font-bold text-slate-800">{p.company_name}</p>
                  <div className="mt-3 flex items-center gap-1.5 bg-emerald-50 rounded-lg px-2 py-1.5 w-max">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-600">Engaged</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
