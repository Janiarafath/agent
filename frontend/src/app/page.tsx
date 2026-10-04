"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, Sparkles, Send, CheckCircle2, SearchIcon, Clock, MessageSquare, Terminal, ChevronRight, Activity, Smartphone, Link2, ShieldAlert, Video } from "lucide-react";
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
// WA status goes through the backend proxy so hosted dashboards work
// (set NEXT_PUBLIC_WHATSAPP_API only for direct local access).
const WHATSAPP_API = process.env.NEXT_PUBLIC_WHATSAPP_API || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:3001";

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
  const [bossPhone, setBossPhone] = useState("");
  const [savingBoss, setSavingBoss] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/api/settings?user_id=${user.uid}`)
      .then((res) => res.json())
      .then((data) => { if (data.admin_phone) setBossPhone(data.admin_phone); })
      .catch(() => {});
  }, [user]);

  const saveBossPhone = async () => {
    if (!user) return;
    setSavingBoss(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid, admin_phone: bossPhone })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || `Server ${res.status}`);
      alert(`Boss alerts ON → ${json.admin_phone || "cleared"}`);
    } catch (err: any) {
      alert(`Save failed: ${err?.message || err}`);
    }
    setSavingBoss(false);
  };

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
        <div className="min-h-screen flex bg-[#0f172a]">
            {/* Brand panel */}
            <div className="hidden md:flex w-[44%] flex-col justify-between p-12 text-white">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-500 rounded-[10px] flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">DashWin</span>
                </div>
                <div>
                    <h1 className="text-4xl font-bold leading-tight tracking-tight">Win the pipeline<br />before lunch.</h1>
                    <ul className="mt-8 space-y-4 text-[15px] text-slate-300">
                        <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> Autonomous lead discovery, verified numbers only</li>
                        <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> Human-approved outreach with guardrails</li>
                        <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> Meetings booked straight to your calendar</li>
                    </ul>
                </div>
                <p className="text-xs text-slate-500">DashWin Sales Automation</p>
            </div>
            {/* Form panel */}
            <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
                <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8">
                    <div className="md:hidden flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-indigo-600 rounded-[10px] flex items-center justify-center">
                            <Activity className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-slate-800">DashWin</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{isLogin ? "Welcome back" : "Create account"}</h2>
                    <p className="text-sm text-slate-500 mt-1 mb-6">{isLogin ? "Sign in to your sales engine." : "Start winning pipelines today."}</p>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full bg-white border border-slate-300 rounded-[10px] px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                className="w-full bg-white border border-slate-300 rounded-[10px] px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                            />
                        </div>
                        <button type="submit" className="ui-press w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-[10px]">
                            {isLogin ? "Sign In" : "Create Account"}
                        </button>
                    </form>
                    <p className="text-center mt-5 text-sm text-slate-500">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-semibold text-indigo-600 hover:text-indigo-700">
                            {isLogin ? "Sign Up" : "Sign In"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Loading DashWin…</p>
        </div>
    </div>
  );

  if (error) return (
    <div className="p-8 max-w-xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <p className="text-sm font-bold text-red-700">Dashboard failed to load</p>
            <p className="text-sm text-red-600 mt-1">{error}. Is the backend running?</p>
        </div>
    </div>
  );

  const cols: { key: string; title: string; match: string[]; accent: string }[] = [
    { key: "queue", title: "Queue", match: ["NEW"], accent: "border-slate-300" },
    { key: "research", title: "Researching", match: ["RESEARCHING"], accent: "border-amber-400" },
    { key: "review", title: "Review", match: ["OUTREACH_READY"], accent: "border-indigo-500" },
    { key: "await", title: "Awaiting", match: ["CONTACTED", "WAITING"], accent: "border-slate-400" },
    { key: "won", title: "Engaged", match: ["REPLIED", "INTERESTED"], accent: "border-emerald-500" },
  ];
  const inCol = (state: string, match: string[]) =>
    match.some((s) => state === s || state === `PipelineState.${s}`);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* WhatsApp QR Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                    <Smartphone className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Connect WhatsApp</h3>
                <p className="text-sm text-slate-500 text-center mb-5">Scan with your WhatsApp mobile app to link this sender.</p>
                {qrCode ? (
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                    </div>
                ) : (
                    <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                )}
                <button onClick={() => setShowQRModal(false)} className="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-700">
                    Cancel
                </button>
            </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pipeline Overview</h1>
            <p className="text-sm text-slate-500 mt-0.5">Live metrics from your DashWin agent.</p>
        </div>
        <button
            onClick={() => !waConnected && setShowQRModal(true)}
            className={`ui-press flex items-center gap-2 px-4 py-2 rounded-[10px] border text-sm font-semibold ${waConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700 cursor-default' : 'border-slate-300 bg-white hover:border-slate-400 text-slate-700'}`}
        >
            <Link2 className="w-4 h-4" />
            {waConnected ? 'WhatsApp Linked' : 'Link WhatsApp'}
        </button>
      </div>

      {/* Command Center */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
              <div className="flex-[2] w-full">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Find leads</label>
                  <div className="relative">
                      <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                      <input
                          type="text"
                          placeholder="E.g. dentists in Chennai…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-[10px] py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                  </div>
              </div>
              <div className="flex-1 w-full">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Boss alerts number</label>
                  <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                      <input
                          type="text"
                          placeholder="919876543210"
                          value={bossPhone}
                          onChange={(e) => setBossPhone(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-[10px] py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                  </div>
              </div>
              <div className="flex gap-2">
                  <button
                      onClick={saveBossPhone}
                      disabled={savingBoss}
                      title="Save boss alerts number"
                      className="ui-press h-[42px] px-4 rounded-[10px] border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
                  >
                      {savingBoss ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      Alerts
                  </button>
                  <button
                      onClick={triggerFollowups}
                      disabled={isFollowup}
                      className="ui-press h-[42px] px-4 rounded-[10px] border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
                  >
                      {isFollowup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4 text-slate-400" />}
                      Follow-ups
                  </button>
                  <button
                      onClick={triggerDiscovery}
                      disabled={isTriggering}
                      className="ui-press h-[42px] px-5 rounded-[10px] bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                      {isTriggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Launch
                  </button>
              </div>
          </div>
      </section>

      {/* Key numbers */}
      <section className="bg-white border border-slate-200 rounded-2xl px-6 py-5 flex flex-wrap items-center gap-x-10 gap-y-4">
          <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total found</p>
              <p className="tnum text-3xl font-bold text-slate-900 mt-1">{data?.metrics.total_leads || 0}</p>
          </div>
          <div className="w-px self-stretch bg-slate-200 hidden sm:block" />
          <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ready to send</p>
              <p className="tnum text-3xl font-bold text-indigo-600 mt-1">{data?.metrics.outreach_ready || 0}</p>
          </div>
          <div className="w-px self-stretch bg-slate-200 hidden sm:block" />
          <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Replied</p>
              <p className="tnum text-3xl font-bold text-emerald-600 mt-1">{data?.metrics.replied || 0}</p>
          </div>
          <div className="w-px self-stretch bg-slate-200 hidden sm:block" />
          <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Researching</p>
              <p className="tnum text-3xl font-bold text-amber-600 mt-1">{data?.metrics.researching || 0}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${waConnected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {meetings.length > 0 ? `${meetings.length} meeting${meetings.length === 1 ? "" : "s"} booked` : "No meetings yet"}
          </div>
      </section>

      {/* Meetings Booked */}
      {meetings.length > 0 && (
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
            <Video className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Meetings booked</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Customers who showed interest and agreed to a time.</p>
        <div className="divide-y divide-slate-100">
            {meetings.map((m: any) => (
              <div key={m.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{m.company}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Agreed: <span className="font-semibold text-slate-700">{m.time}</span></p>
                    {m.interest && <p className="text-xs text-emerald-700 mt-0.5">{m.interest}</p>}
                  </div>
                  <a href={m.link} target="_blank" rel="noreferrer" className="ui-press shrink-0 px-4 py-2 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center">
                    Join call
                  </a>
              </div>
            ))}
        </div>
      </section>
      )}

      {/* Pipeline board */}
      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3 px-1">Pipeline</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {cols.map((col) => {
            const cards = (data?.pipeline || []).filter((p) => inCol(p.pipeline_state, col.match));
            return (
            <div key={col.key} className="flex flex-col bg-slate-100 rounded-2xl border border-slate-200 p-2 min-h-[180px]">
              <div className="px-2 py-1.5 mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{col.title}</span>
                  <span className="tnum bg-white border border-slate-200 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded-full">{cards.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[520px] pr-0.5">
                {cards.map((p) => (
                  <div key={p.id} className={`bg-white p-3 rounded-xl border border-slate-200 border-l-4 ${col.accent} relative`}>
                    {p.ai_muted && <ShieldAlert className="absolute top-2.5 right-2.5 w-4 h-4 text-red-500" />}
                    <p className="text-[13px] font-bold text-slate-900 leading-snug pr-5">{p.company_name}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1">SRC: {p.business_signals?.source || 'SYSTEM'}</p>
                    {col.key === "review" && (
                      <button
                          onClick={() => approveOutreach(p.id)}
                          disabled={approvingId === p.id}
                          className="ui-press mt-2.5 w-full bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 text-[11px] font-bold py-1.5 rounded-lg flex items-center justify-center gap-1"
                      >
                          {approvingId === p.id ? "Sending…" : <>Approve <ChevronRight className="w-3 h-3" /></>}
                      </button>
                    )}
                    {col.key === "research" && (
                      <div className="mt-2 flex items-center gap-1.5 text-amber-600">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span className="text-[10px] font-bold">Scraping web…</span>
                      </div>
                    )}
                    {col.key === "await" && !p.ai_muted && (
                      <div className="mt-2 flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase">Standby</span>
                      </div>
                    )}
                    {col.key === "won" && (
                      <div className="mt-2 flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase">Engaged</span>
                      </div>
                    )}
                  </div>
                ))}
                {cards.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-4">Empty</p>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center gap-2 px-1 pt-2 text-xs text-slate-400">
          <Search className="w-3.5 h-3.5" />
          DashWin finds public business contacts, verifies WhatsApp, and drafts outreach for your approval.
      </footer>
    </div>
  );
}
