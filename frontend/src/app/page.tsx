"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, Sparkles, Send, CheckCircle2, SearchIcon, Clock, MessageSquare, Terminal, ChevronRight, Activity, Smartphone, Link2, ShieldAlert } from "lucide-react";

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

const API_BASE = "https://agent-k70h.onrender.com"; // Change to http://127.0.0.1:8000 for local testing
const WHATSAPP_API = "http://127.0.0.1:3001"; // Local WebJS Server

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTriggering, setIsTriggering] = useState(false);
  const [isFollowup, setIsFollowup] = useState(false);

  // WhatsApp Connection State
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [waConnected, setWaConnected] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Poll for Dashboard Data
  useEffect(() => {
    const fetchDashboard = () => {
      fetch(`${API_BASE}/api/dashboard`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to connect to Python Engine");
          return res.json();
        })
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    };
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll for WhatsApp Status
  useEffect(() => {
    const checkWaStatus = async () => {
        try {
            const res = await fetch(`${WHATSAPP_API}/api/whatsapp/status`);
            const json = await res.json();
            setWaConnected(json.connected);
            if (json.qr && !json.connected) {
                setQrCode(json.qr);
            }
            if (json.connected) {
                setShowQRModal(false);
            }
        } catch (e) {
            console.error("WhatsApp server not responding");
        }
    };
    checkWaStatus();
    const interval = setInterval(checkWaStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const triggerDiscovery = async () => {
    setIsTriggering(true);
    try {
      await fetch(`${API_BASE}/api/trigger-discovery`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery || "B2B SaaS companies" })
      });
      alert(`Autonomous Discovery Job Queued`);
    } catch (err) {}
    setIsTriggering(false);
  };

  const triggerFollowups = async () => {
    setIsFollowup(true);
    try {
      await fetch(`${API_BASE}/api/trigger-followups`, { method: "POST" });
    } catch (err) {}
    setIsFollowup(false);
  };
  
  const approveOutreach = async (id: number) => {
    if (!waConnected) {
        alert("Please connect WhatsApp first!");
        setShowQRModal(true);
        return;
    }
    try {
        await fetch(`${API_BASE}/api/approve/${id}`, { method: "POST" });
    } catch (err) {}
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-zinc-400">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
            <p className="text-xs uppercase tracking-widest font-mono">Initializing Agent...</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-zinc-800">
      
      {/* WhatsApp QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111] border border-white/10 rounded-xl p-8 max-w-sm w-full flex flex-col items-center">
                <Smartphone className="w-10 h-10 text-emerald-500 mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Connect WhatsApp</h3>
                <p className="text-sm text-zinc-400 text-center mb-6">Scan this code with your WhatsApp mobile app to link your account as a sender.</p>
                
                {qrCode ? (
                    <div className="bg-white p-4 rounded-lg">
                        <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                    </div>
                ) : (
                    <div className="w-48 h-48 bg-[#1a1a1a] rounded-lg flex items-center justify-center border border-white/5">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                    </div>
                )}
                
                <button 
                    onClick={() => setShowQRModal(false)}
                    className="mt-6 text-xs text-zinc-500 hover:text-white uppercase tracking-widest font-mono"
                >
                    Cancel
                </button>
            </div>
        </div>
      )}

      {/* Brutalist Grid Background */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.2]" />
      
      {/* Top Navigation Bar */}
      <nav className="border-b border-white/[0.08] bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-white rounded-[4px] flex items-center justify-center">
                    <Activity className="w-3 h-3 text-black" />
                </div>
                <span className="font-semibold text-sm tracking-tight text-zinc-100">GrowthPilot Engine</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-[10px] text-zinc-400 font-mono ml-2">v2.0.0-beta</span>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => !waConnected && setShowQRModal(true)}
                    className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-md border transition-all ${waConnected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default' : 'border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white'}`}
                >
                    <Link2 className="w-3 h-3" />
                    {waConnected ? 'WhatsApp Connected' : 'Link WhatsApp'}
                </button>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Agent Online
                </div>
            </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-[1400px] mx-auto px-6 py-8">
        
        {/* Command Center */}
        <section className="mb-12">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2 block">Agent Directive</label>
                    <div className="relative group">
                        <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input 
                            type="text" 
                            placeholder="Enter industry and location (e.g. B2B SaaS in NY)..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#111] border border-white/[0.08] rounded-md py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                        />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={triggerFollowups}
                        disabled={isFollowup}
                        className="h-[42px] px-4 rounded-md border border-white/[0.08] bg-[#111] text-zinc-300 text-sm font-medium hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isFollowup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                        Run Follow-ups
                    </button>
                    <button 
                        onClick={triggerDiscovery}
                        disabled={isTriggering}
                        className="h-[42px] px-6 rounded-md bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isTriggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Execute Search
                    </button>
                </div>
            </div>
        </section>
        
        {/* Telemetry Data */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Total Leads Discovered", value: data?.metrics.total_leads || 0, icon: SearchIcon },
            { label: "Actively Researching", value: data?.metrics.researching || 0, icon: Activity },
            { label: "Drafts Awaiting Review", value: data?.metrics.outreach_ready || 0, icon: Send },
            { label: "Replies Received", value: data?.metrics.replied || 0, icon: MessageSquare }
          ].map((stat, i) => (
            <div key={i} className="bg-[#111] border border-white/[0.06] rounded-lg p-5 hover:border-white/[0.12] transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <stat.icon className="w-3.5 h-3.5 text-zinc-500" />
                <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{stat.label}</h3>
              </div>
              <p className="text-3xl font-semibold text-zinc-100">{stat.value}</p>
            </div>
          ))}
        </section>
        
        {/* Pipeline Interface */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-lg font-medium text-zinc-100">Pipeline State</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/[0.08] to-transparent ml-4" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-[600px]">
            
            {/* Column 1: NEW */}
            <div className="flex flex-col h-full bg-[#111]/50 border border-white/[0.04] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-white/[0.04] bg-[#111]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                    Queue
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">{data?.metrics.new || 0}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.NEW' || p.pipeline_state === 'NEW').map(p => (
                  <div key={p.id} className="bg-[#1a1a1a] p-3 rounded-md border border-white/[0.06] hover:border-white/[0.12] transition-colors cursor-default relative">
                    {p.ai_muted && <ShieldAlert className="absolute top-2 right-2 w-3 h-3 text-red-500" />}
                    <p className="text-sm text-zinc-200 font-medium truncate pr-4">{p.company_name}</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-2 truncate">SRC: {p.business_signals?.source || 'SYSTEM'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: RESEARCHING */}
            <div className="flex flex-col h-full bg-[#111]/50 border border-white/[0.04] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-white/[0.04] bg-[#111]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                    Agent Active
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">{data?.metrics.researching || 0}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.RESEARCHING' || p.pipeline_state === 'RESEARCHING').map(p => (
                  <div key={p.id} className="bg-[#1a1a1a] p-3 rounded-md border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)] relative">
                    {p.ai_muted && <ShieldAlert className="absolute top-2 right-2 w-3 h-3 text-red-500" />}
                    <p className="text-sm text-zinc-200 font-medium truncate pr-4">{p.company_name}</p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 text-amber-500/70 animate-spin" />
                        <span className="text-[10px] font-mono text-amber-500/70">SCRAPING_DATA</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: OUTREACH READY */}
            <div className="flex flex-col h-full bg-[#111]/50 border border-white/[0.04] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-white/[0.04] bg-[#111]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500/50" />
                    Review
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">{data?.metrics.outreach_ready || 0}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.OUTREACH_READY' || p.pipeline_state === 'OUTREACH_READY').map(p => (
                  <div key={p.id} className="bg-[#1a1a1a] p-3 rounded-md border border-purple-500/30 group relative">
                    {p.ai_muted && <ShieldAlert className="absolute top-2 right-2 w-3 h-3 text-red-500" />}
                    <p className="text-sm text-zinc-200 font-medium truncate pr-4">{p.company_name}</p>
                    <button 
                        onClick={() => approveOutreach(p.id)} 
                        className="mt-3 w-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-[11px] font-mono py-1.5 rounded transition-all flex items-center justify-center gap-1.5"
                    >
                        EXECUTE_SEND <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 4: CONTACTED */}
            <div className="flex flex-col h-full bg-[#111]/50 border border-white/[0.04] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-white/[0.04] bg-[#111]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500/50" />
                    Awaiting
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">-</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.CONTACTED' || p.pipeline_state === 'CONTACTED').map(p => (
                  <div key={p.id} className="bg-[#1a1a1a] p-3 rounded-md border border-white/[0.06] relative">
                    {p.ai_muted && (
                        <div className="mb-2 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-red-400" />
                            <span className="text-[9px] font-mono text-red-400 uppercase">AI Muted (Human Mode)</span>
                        </div>
                    )}
                    <p className="text-sm text-zinc-200 font-medium truncate">{p.company_name}</p>
                    <div className="mt-2.5 flex items-center gap-1.5 text-zinc-500">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-mono">STANDBY</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 5: REPLIED */}
            <div className="flex flex-col h-full bg-[#111]/50 border border-white/[0.04] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-white/[0.04] bg-[#111]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                    Success
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">{data?.metrics.replied || 0}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.REPLIED' || p.pipeline_state === 'REPLIED').map(p => (
                  <div key={p.id} className="bg-[#1a1a1a] p-3 rounded-md border border-emerald-500/30 relative">
                    {p.ai_muted && (
                        <div className="mb-2 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-red-400" />
                            <span className="text-[9px] font-mono text-red-400 uppercase">AI Muted (Human Mode)</span>
                        </div>
                    )}
                    <p className="text-sm text-zinc-200 font-medium truncate">{p.company_name}</p>
                    <div className="mt-2.5 flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="text-[10px] font-mono">ENGAGED</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
