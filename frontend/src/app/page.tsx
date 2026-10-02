"use client";

import { useEffect, useState } from "react";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { ShinyButton } from "@/components/ui/shiny-button";
import { Search, Loader2, Sparkles, Send, CheckCircle2, SearchIcon, Clock, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

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
  }[];
}

const API_BASE = "https://agent-k70h.onrender.com"; // Change to http://127.0.0.1:8000 for local testing

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  const [isTriggering, setIsTriggering] = useState(false);
  const [isFollowup, setIsFollowup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const triggerDiscovery = async () => {
    setIsTriggering(true);
    try {
      await fetch(`${API_BASE}/api/trigger-discovery`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery || "B2B SaaS companies" })
      });
      alert(`Autonomous Discovery Job Queued for '${searchQuery || "B2B SaaS companies"}'! Refresh in 30 seconds.`);
    } catch (err) {}
    setIsTriggering(false);
  };

  const triggerFollowups = async () => {
    setIsFollowup(true);
    try {
      await fetch(`${API_BASE}/api/trigger-followups`, { method: "POST" });
      alert("Follow-Up Engine Activated! It is scanning the database and sending texts.");
    } catch (err) {}
    setIsFollowup(false);
  };
  
  const approveOutreach = async (id: number) => {
    try {
        await fetch(`${API_BASE}/api/approve/${id}`, { method: "POST" });
        alert("Approved! Message sent to prospect via WhatsApp.");
        // Optimistic UI update could go here
    } catch (err) {}
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 relative overflow-hidden font-sans">
      <BackgroundBeams />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Header Section */}
        <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                GrowthPilot AI
              </span>
            </h1>
            <p className="text-slate-400 text-lg">Autonomous SaaS Engine. Live Output.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-500" />
                </div>
                <input 
                    type="text" 
                    placeholder="e.g. B2B SaaS companies in NY..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-700/50 rounded-2xl leading-5 bg-slate-900/50 backdrop-blur-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                />
            </div>
            
            <ShinyButton onClick={triggerDiscovery} disabled={isTriggering}>
                {isTriggering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {isTriggering ? "Scraping..." : "Find Leads"}
            </ShinyButton>
          </div>
        </motion.header>
        
        {/* Metrics Bento Grid */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-sm font-medium text-slate-400 flex items-center"><SearchIcon className="w-4 h-4 mr-2" /> Total Found</h3>
            <p className="text-5xl font-bold mt-4 text-white">{data?.metrics.total_leads || 0}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-sm font-medium text-slate-400 flex items-center"><Clock className="w-4 h-4 mr-2" /> Researching</h3>
            <p className="text-5xl font-bold mt-4 text-yellow-400">{data?.metrics.researching || 0}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-sm font-medium text-slate-400 flex items-center"><Send className="w-4 h-4 mr-2" /> Drafted</h3>
            <p className="text-5xl font-bold mt-4 text-purple-400">{data?.metrics.outreach_ready || 0}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-sm font-medium text-slate-400 flex items-center"><MessageSquare className="w-4 h-4 mr-2" /> Replied</h3>
            <p className="text-5xl font-bold mt-4 text-green-400">{data?.metrics.replied || 0}</p>
          </div>
        </motion.div>
        
        {/* Kanban Pipeline Board */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight">Live AI Pipeline</h2>
            <button 
                onClick={triggerFollowups}
                disabled={isFollowup}
                className="text-sm text-slate-400 hover:text-white transition-colors flex items-center"
            >
                {isFollowup ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                Force Follow-Ups
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[500px]">
            
            {/* Column 1: NEW */}
            <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-4 border border-white/5 flex flex-col">
              <div className="flex justify-between items-center mb-6 px-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">New</h4>
                <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-full font-medium">{data?.metrics.new || 0}</span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.NEW' || p.pipeline_state === 'NEW').map(p => (
                  <div key={p.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                    <p className="font-semibold text-slate-200">{p.company_name}</p>
                    <p className="text-xs font-medium text-slate-500 mt-2 truncate">Source: {p.business_signals?.source || 'Agent Discovery'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: RESEARCHING */}
            <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-4 border border-white/5 flex flex-col">
               <div className="flex justify-between items-center mb-6 px-2">
                 <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Researching</h4>
                 <span className="bg-yellow-500/10 text-yellow-400 text-xs px-2.5 py-1 rounded-full font-medium">{data?.metrics.researching || 0}</span>
               </div>
               <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.RESEARCHING' || p.pipeline_state === 'RESEARCHING').map(p => (
                  <div key={p.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:border-yellow-500/30 transition-colors">
                    <p className="font-semibold text-slate-200">{p.company_name}</p>
                    <div className="mt-3 flex items-center text-xs text-yellow-500">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Scraping site...
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: OUTREACH READY */}
            <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-4 border border-purple-500/20 flex flex-col relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
               <div className="flex justify-between items-center mb-6 px-2 relative z-10">
                 <h4 className="text-xs font-bold uppercase tracking-widest text-purple-400">Outreach Ready</h4>
                 <span className="bg-purple-500/20 text-purple-300 text-xs px-2.5 py-1 rounded-full font-medium">{data?.metrics.outreach_ready || 0}</span>
               </div>
               <div className="space-y-3 flex-1 overflow-y-auto pr-1 relative z-10">
                {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.OUTREACH_READY' || p.pipeline_state === 'OUTREACH_READY').map(p => (
                  <div key={p.id} className="bg-purple-500/10 p-4 rounded-2xl border border-purple-500/30">
                    <p className="font-semibold text-white">{p.company_name}</p>
                    <button 
                        onClick={() => approveOutreach(p.id)} 
                        className="mt-4 w-full bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold py-2 rounded-xl transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center justify-center"
                    >
                        <Send className="w-3 h-3 mr-2" /> Approve & Send
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 4: CONTACTED */}
            <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-4 border border-white/5 flex flex-col">
               <div className="flex justify-between items-center mb-6 px-2">
                 <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Contacted</h4>
                 <span className="bg-orange-500/10 text-orange-400 text-xs px-2.5 py-1 rounded-full font-medium">-</span>
               </div>
               <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.CONTACTED' || p.pipeline_state === 'CONTACTED').map(p => (
                  <div key={p.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:border-orange-500/30 transition-colors">
                    <p className="font-semibold text-slate-200">{p.company_name}</p>
                    <p className="text-xs text-orange-400 mt-2 font-medium flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> Waiting for reply
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 5: REPLIED */}
            <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-4 border border-green-500/20 flex flex-col relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />
               <div className="flex justify-between items-center mb-6 px-2 relative z-10">
                 <h4 className="text-xs font-bold uppercase tracking-widest text-green-400">Replied</h4>
                 <span className="bg-green-500/20 text-green-300 text-xs px-2.5 py-1 rounded-full font-medium">{data?.metrics.replied || 0}</span>
               </div>
               <div className="space-y-3 flex-1 overflow-y-auto pr-1 relative z-10">
                {data?.pipeline.filter(p => p.pipeline_state === 'PipelineState.REPLIED' || p.pipeline_state === 'REPLIED').map(p => (
                  <div key={p.id} className="bg-green-500/10 p-4 rounded-2xl border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                    <p className="font-semibold text-white">{p.company_name}</p>
                    <p className="text-xs text-green-400 mt-2 font-bold flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Meeting Booked!
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
