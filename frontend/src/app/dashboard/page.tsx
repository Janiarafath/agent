"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, Send, CheckCircle2, Clock, MessageSquare, Terminal, ChevronRight, Activity, Smartphone, Link2, ShieldAlert, Video, Search } from "lucide-react";
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

export default function DashboardPage() {
  const { user } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTriggering, setIsTriggering] = useState(false);
  const [isFollowup, setIsFollowup] = useState(false);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [waConnected, setWaConnected] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [money, setMoney] = useState<any>(null);
  const [recovery, setRecovery] = useState<any[]>([]);
  const [muted, setMuted] = useState<any[]>([]);
  const [job, setJob] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [profile, setProfile] = useState<any>({ business_name: "", industry: "", services: "", pricing: "", hours: "", location: "", avg_deal_inr: 5000 });
  const [templates, setTemplates] = useState<any[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const toastShown = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchDashboard = () => {
      fetch(`${API_BASE}/api/dashboard?user_id=${user.uid}`)
        .then((res) => res.json())
        .then((data) => { setData(data); setLoading(false); })
        .catch((err) => { setError(err.message); setLoading(false); });
      fetch(`${API_BASE}/api/meetings?user_id=${user.uid}`)
        .then((res) => res.json())
        .then((data) => { setMeetings(data.meetings || []); })
        .catch(() => {});
      fetch(`${API_BASE}/api/money?user_id=${user.uid}`)
        .then((res) => res.json())
        .then((data) => { setMoney(data); })
        .catch(() => {});
      fetch(`${API_BASE}/api/recovery?user_id=${user.uid}`)
        .then((res) => res.json())
        .then((data) => { setRecovery(data.recovery || []); })
        .catch(() => {});
      fetch(`${API_BASE}/api/muted?user_id=${user.uid}`)
        .then((res) => res.json())
        .then((data) => { setMuted(data.muted || []); })
        .catch(() => {});
      fetch(`${API_BASE}/api/jobs?user_id=${user.uid}`)
        .then((res) => res.json())
        .then((data) => {
          const jobs = data.jobs || [];
          const active = jobs.find((j: any) => j.status === "queued" || j.status === "running");
          setJob(active || jobs[0] || null);
          const done = jobs.find((j: any) => j.status === "done");
          if (done && done.result && !toastShown.current.has(done.id)) {
            toastShown.current.add(done.id);
            setToast(done.result);
            setTimeout(() => setToast(""), 8000);
          }
        })
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

  const triggerDiscovery = async () => {
    if (!user) return;
    setIsTriggering(true);
    try {
      const raw = (searchQuery || "dentists in Chennai, India").trim();
      let category = raw, city = "Chennai, India";
      const m = raw.match(/(.+?)\s+(?:in|at|,)\s+(.+)/i);
      if (m) { category = m[1].trim(); city = m[2].trim(); }
      const res = await fetch(`${API_BASE}/api/discover`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, city, user_id: user.uid, max_results: 25 })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || `Server ${res.status}`);
      setJob({ id: json.job_id || 0, kind: "discover", status: "queued", stage: "queued", result: `Finding ${category} in ${city}…` });
      setToast(`Searching ${category} in ${city}… watch this space.`);
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
  // ALL hooks must stay above every early return (React #310 otherwise).
  const [activeStage, setActiveStage] = useState<string>("review");

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

  const triggerRecovery = async () => {
    if (!user) return;
    setRecovering(true);
    try {
      const res = await fetch(`${API_BASE}/api/trigger-recovery?user_id=${user.uid}`, { method: "POST" });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      setToast("Recovery scan running — hot leads incoming.");
      setTimeout(() => setToast(""), 6000);
    } catch (err: any) {
      alert(`Scan failed: ${err?.message || err}`);
    }
    setRecovering(false);
  };

  const approveRecovery = async (id: number) => {
    if (!user) return;
    if (!waConnected) { alert("Please connect WhatsApp first!"); setShowQRModal(true); return; }
    setApprovingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/recovery/${id}/approve?user_id=${user.uid}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || `Server ${res.status}`);
      alert("Recovery sent!");
    } catch (err: any) {
      alert(`Not sent: ${err?.message || err}`);
    }
    setApprovingId(null);
  };

  const skipRecovery = async (id: number) => {
    if (!user) return;
    try {
      await fetch(`${API_BASE}/api/recovery/${id}/skip?user_id=${user.uid}`, { method: "POST" });
      setRecovery((r) => r.filter((x: any) => x.id !== id));
    } catch (err) {}
  };

  const saveRecoveryEdit = async (id: number) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/recovery/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid, draft: editText })
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      setRecovery((r) => r.map((x: any) => x.id === id ? { ...x, draft: editText } : x));
      setEditingId(null);
    } catch (err: any) {
      alert(`Save failed: ${err?.message || err}`);
    }
  };
  const resumeChat = async (sender_phone: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/resume`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid, sender_phone })
      });
      const json = await res.json().catch(() => ({}));
      alert(json.status === "resumed" ? "AI resumed for this chat." : "Nothing was muted.");
      setMuted((m) => m.filter((x: any) => x.sender_phone !== sender_phone));
    } catch (err: any) {
      alert(`Resume failed: ${err?.message || err}`);
    }
  };

  const markWon = async (id: number) => {
    if (!user) return;
    const amt = prompt("Collected amount in ₹ (real money only):", "");
    if (amt === null) return;
    const amount = parseInt(amt.replace(/[^0-9]/g, "") || "0");
    if (!amount) { alert("Enter an amount above 0, or Cancel."); return; }
    try {
      const res = await fetch(`${API_BASE}/api/meetings/${id}/won`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid, amount_inr: amount })
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      alert(`Won! ₹${amount.toLocaleString("en-IN")} added to recovered revenue.`);
    } catch (err: any) {
      alert(`Failed: ${err?.message || err}`);
    }
  };

  const loadProfileEtc = async () => {    if (!user) return;
    try {
      const p = await fetch(`${API_BASE}/api/profile?user_id=${user.uid}`).then((r) => r.json());
      setProfile({ business_name: p.business_name || "", industry: p.industry || "", services: p.services || "", pricing: p.pricing || "", hours: p.hours || "", location: p.location || "", avg_deal_inr: p.avg_deal_inr || 5000 });
      const t = await fetch(`${API_BASE}/api/templates`).then((r) => r.json());
      setTemplates(t.templates || []);
    } catch (err) {}
  };

  useEffect(() => { loadProfileEtc(); }, [user]);

  useEffect(() => { if (user) loadProfileEtc(); }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid, ...profile, avg_deal_inr: parseInt(profile.avg_deal_inr) || 5000 })
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      alert("Business profile saved — AI answers from this now.");
    } catch (err: any) {
      alert(`Save failed: ${err?.message || err}`);
    }
    setSavingProfile(false);
  };

  const applyTemplate = async (industry: string) => {
    if (!user) return;
    if (!confirm(`Fill empty business fields from the ${industry} pack? Your words are never overwritten.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/templates/apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.uid, industry })
      });
      const json = await res.json();
      if (json.status !== "applied") throw new Error("Unknown industry");
      alert(`Template applied (${(json.changed || []).join(", ") || "nothing empty"}). Review below, edit freely.`);
      loadProfileEtc();
    } catch (err: any) {
      alert(`Template failed: ${err?.message || err}`);
    }
  };

  if (!user && !loading) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#120044]">Sign in to open your dashboard</h1>
        <p className="text-sm text-[#4c4480] mt-2">Your pipeline lives behind your account.</p>
        <Link href="/login" className="ui-press inline-block mt-6 bg-[#5951ff] hover:bg-[#4640e0] text-white font-semibold px-6 py-2.5 rounded text-sm">
          Go to sign in
        </Link>
      </div>
    );
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#5951ff]" />
            <p className="text-xs font-semibold uppercase tracking-widest text-[#4c4480]">Loading DashWin…</p>
        </div>
    </div>
  );

  if (error) return (
    <div className="p-8 max-w-xl mx-auto">
        <div className="bg-[#fef2f2] border border-red-200 rounded-lg p-6">
            <p className="text-sm font-bold text-red-700">Dashboard failed to load</p>
            <p className="text-sm text-red-600 mt-1">{error}. Is the backend running?</p>
        </div>
    </div>
  );

  const stages: { key: string; title: string; match: string[] }[] = [
    { key: "queue", title: "Queue", match: ["NEW"] },
    { key: "research", title: "Research", match: ["RESEARCHING"] },
    { key: "review", title: "Review", match: ["OUTREACH_READY"] },
    { key: "await", title: "Awaiting", match: ["CONTACTED", "WAITING"] },
    { key: "won", title: "Engaged", match: ["REPLIED", "INTERESTED"] },
  ];
  const inStage = (state: string, match: string[]) =>
    match.some((s) => state === s || state === `PipelineState.${s}`);
  const stageLeads = (data?.pipeline || []).filter((p) =>
    inStage(p.pipeline_state, stages.find((s) => s.key === activeStage)?.match || []));
  const stageCount = (key: string) =>
    (data?.pipeline || []).filter((p) => inStage(p.pipeline_state, stages.find((s) => s.key === key)?.match || [])).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {showQRModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#120044]/50">
            <div className="bg-white border border-[#e4e1f5] rounded-lg p-8 max-w-sm w-full flex flex-col items-center">
                <div className="w-12 h-12 bg-[#ecfdf5] rounded-full flex items-center justify-center mb-3">
                    <Smartphone className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-[#120044] mb-1">Connect WhatsApp</h3>
                <p className="text-sm text-[#4c4480] text-center mb-5">Scan with your WhatsApp mobile app to link this sender.</p>
                {qrCode ? (
                    <div className="bg-white p-3 rounded border border-[#e4e1f5]">
                        <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                    </div>
                ) : (
                    <div className="w-48 h-48 bg-slate-100 rounded flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                )}
                <button onClick={() => setShowQRModal(false)} className="mt-5 text-sm font-semibold text-[#4c4480] hover:text-[#120044]">
                    Cancel
                </button>
            </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#120044]">Pipeline Overview</h1>
            <p className="text-sm text-[#4c4480] mt-0.5">Live metrics from your DashWin agent.</p>
        </div>
        <button
            onClick={() => !waConnected && setShowQRModal(true)}
            className={`ui-press flex items-center gap-2 px-4 py-2 rounded border text-sm font-semibold ${waConnected ? 'border-emerald-200 bg-[#ecfdf5] text-emerald-700 cursor-default' : 'border-[#e4e1f5] bg-white hover:border-[#5951ff] text-[#120044]'}`}
        >
            <Link2 className="w-4 h-4" />
            {waConnected ? 'WhatsApp Linked' : 'Link WhatsApp'}
        </button>
      </div>

      {/* Command Center */}
      <section className="bg-white border border-[#e4e1f5] rounded-lg p-5">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
              <div className="flex-[2] w-full">
                  <label className="text-xs font-semibold text-[#4c4480] uppercase tracking-wider mb-2 block">Find leads</label>
                  <div className="relative">
                      <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5951ff]" />
                      <input type="text" placeholder="E.g. dentists in Chennai…"
                          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-white border border-[#e4e1f5] rounded py-2.5 pl-11 pr-4 text-sm text-[#120044] placeholder:text-[#a099b4] focus:outline-none focus:border-[#5951ff] focus:ring-2 focus:ring-[#5951ff]/20" />
                  </div>
              </div>
              <div className="flex-1 w-full">
                  <label className="text-xs font-semibold text-[#4c4480] uppercase tracking-wider mb-2 block">Boss alerts number</label>
                  <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                      <input type="text" placeholder="919876543210"
                          value={bossPhone} onChange={(e) => setBossPhone(e.target.value)}
                          className="w-full bg-white border border-[#e4e1f5] rounded py-2.5 pl-11 pr-4 text-sm text-[#120044] placeholder:text-[#a099b4] focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
              </div>
              <div className="flex gap-2">
                  <button onClick={saveBossPhone} disabled={savingBoss} title="Save boss alerts number"
                      className="ui-press h-[42px] px-4 rounded border border-[#e4e1f5] bg-white text-[#120044] text-sm font-semibold hover:bg-[#f6f5ff] disabled:opacity-50 flex items-center gap-2">
                      {savingBoss ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      Alerts
                  </button>
                  <button onClick={triggerFollowups} disabled={isFollowup}
                      className="ui-press h-[42px] px-4 rounded border border-[#e4e1f5] bg-white text-[#120044] text-sm font-semibold hover:bg-[#f6f5ff] disabled:opacity-50 flex items-center gap-2">
                      {isFollowup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4 text-[#a099b4]" />}
                      Follow-ups
                  </button>
                  <button onClick={triggerDiscovery} disabled={isTriggering}
                      className="ui-press h-[42px] px-5 rounded bg-[#5951ff] text-white text-sm font-semibold hover:bg-[#4640e0] disabled:opacity-50 flex items-center gap-2">
                      {isTriggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Launch
                  </button>
              </div>
          </div>
      </section>

      {/* Money left on the table */}
      <section className="bg-[#120044] rounded-lg px-6 py-5 text-white">
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Est. pipeline</p>
                  {money && money.estimated_pipeline_inr != null ? (
                    <p className="tnum text-3xl font-bold mt-1">₹{(money.estimated_pipeline_inr || 0).toLocaleString("en-IN")}</p>
                  ) : (
                    <p className="text-sm font-bold mt-2 text-amber-300">Set your avg deal in Business below ↓</p>
                  )}
              </div>
              <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Hot leads</p>
                  <p className="tnum text-3xl font-bold mt-1">{money?.hot_leads ?? 0}</p>
              </div>
              <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Follow-ups due</p>
                  <p className="tnum text-3xl font-bold mt-1">{money?.followups_due ?? 0}</p>
              </div>
              <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Meetings</p>
                  <p className="tnum text-3xl font-bold mt-1">{money?.meetings_booked ?? 0}</p>
              </div>
              <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Recovered</p>
                  <p className="tnum text-3xl font-bold text-emerald-300 mt-1">{money?.recovered ?? 0}</p>
                  {(money?.recovered_revenue_inr || 0) > 0 && (
                    <p className="tnum text-xs font-bold text-emerald-300 mt-0.5">₹{(money.recovered_revenue_inr || 0).toLocaleString("en-IN")} real</p>
                  )}
              </div>
              <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Hours saved</p>
                  <p className="tnum text-3xl font-bold mt-1">{money?.hours_saved ?? 0}h</p>
              </div>
              <button onClick={triggerRecovery} disabled={recovering}
                  className="ui-press ml-auto bg-[#5951ff] hover:bg-[#4640e0] disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded flex items-center gap-2">
                  {recovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Recover Lost Leads
              </button>
          </div>
          <p className="text-[11px] text-white/40 mt-3">Expected per lead = score × YOUR avg deal. Recovered ₹ counts only deals you mark won.</p>
      </section>

      {/* Live job progress */}
      {job && (job.status === "queued" || job.status === "running") && (
        <div className="bg-[#efedff] border border-[#5951ff]/30 rounded-lg px-5 py-3 flex items-center gap-3 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-[#5951ff] shrink-0" />
            <p className="text-[#120044]">
              <span className="font-bold capitalize">{job.stage || job.status}</span>
              {job.total ? <span className="tnum text-[#4c4480]"> — {job.done || 0}/{job.total}</span> : null}
              <span className="text-[#4c4480]"> — Tavily is searching, then numbers get verified. No need to wait here.</span>
            </p>
        </div>
      )}

      {/* Recovery queue */}
      {recovery.length > 0 && (
      <section className="bg-white border border-[#e4e1f5] rounded-lg p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#120044]">Recovery queue</h2>
          <span className="tnum text-xs font-bold text-[#4c4480]">{recovery.length} waiting</span>
        </div>
        <div className="divide-y divide-[#f1eefb] mt-2">
          {recovery.map((r: any) => (
            <div key={r.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${r.temp === "HOT" ? "bg-red-100 text-red-700" : r.temp === "WARM" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{r.temp}</span>
                <p className="text-sm font-bold text-[#120044]">{r.company}</p>
                <p className="text-xs text-[#4c4480]">{r.reason} · {r.next_action}</p>
              </div>
              {editingId === r.id ? (
                <div className="mt-2">
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2}
                    className="w-full bg-white border border-[#e4e1f5] rounded p-2 text-sm text-[#120044] focus:outline-none focus:border-[#5951ff]" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => saveRecoveryEdit(r.id)} className="ui-press bg-[#5951ff] text-white text-xs font-bold px-4 py-1.5 rounded">Save</button>
                    <button onClick={() => setEditingId(null)} className="ui-press border border-[#e4e1f5] text-xs font-bold px-4 py-1.5 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#4c4480] mt-1.5 leading-relaxed">“{r.draft}”</p>
              )}
              {editingId !== r.id && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button onClick={() => approveRecovery(r.id)} disabled={approvingId === r.id}
                    className="ui-press bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded">
                    {approvingId === r.id ? "Sending…" : "Approve & send"}
                  </button>
                  <button onClick={() => { setEditingId(r.id); setEditText(r.draft); }}
                    className="ui-press border border-[#e4e1f5] text-xs font-bold px-4 py-1.5 rounded">Edit</button>
                  <button onClick={() => skipRecovery(r.id)}
                    className="ui-press text-[#a099b4] hover:text-[#120044] text-xs font-bold px-2 py-1.5">Skip</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      {/* Board + rail: journey across, detail beside — no vertical kanban */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <section className="lg:col-span-2 bg-white border border-[#e4e1f5] rounded-lg overflow-hidden">
          <div className="px-5 pt-4">
            <h2 className="text-base font-bold text-[#120044]">Revenue journey</h2>
          </div>
          {/* Horizontal stages */}
          <div className="flex items-stretch px-5 pt-3 overflow-x-auto">
            {stages.map((s, i) => {
              const active = activeStage === s.key;
              const n = stageCount(s.key);
              return (
                <button key={s.key} onClick={() => setActiveStage(s.key)}
                  className={`ui-press flex-1 min-w-[110px] text-left px-3 py-2.5 border-b-2 ${active ? "border-[#5951ff]" : "border-transparent hover:border-[#e4e1f5]"}`}>
                  <span className="tnum text-[10px] font-bold text-[#a099b4]">0{i + 1}</span>
                  <span className={`block text-sm font-bold ${active ? "text-[#120044]" : "text-[#4c4480]"}`}>{s.title}</span>
                  <span className={`tnum text-xs font-bold ${active ? "text-[#5951ff]" : "text-[#a099b4]"}`}>{n}</span>
                </button>
              );
            })}
          </div>
          {/* Unified lead table */}
          <div className="border-t border-[#e4e1f5]">
            <div className="hidden md:grid grid-cols-[1fr_110px_130px] gap-3 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#a099b4] border-b border-[#e4e1f5]">
              <span>Company</span><span>Source</span><span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-[#f1eefb] max-h-[460px] overflow-y-auto">
              {stageLeads.map((p) => (
                <div key={p.id} className="grid md:grid-cols-[1fr_110px_130px] gap-2 md:gap-3 px-5 py-3 items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-bold text-[#120044] truncate">{p.company_name}</p>
                    {p.ai_muted && <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  </div>
                  <p className="text-[11px] font-medium text-[#a099b4] truncate">{p.business_signals?.source || "SYSTEM"}</p>
                  <div className="md:text-right">
                    {activeStage === "review" ? (
                      <button onClick={() => approveOutreach(p.id)} disabled={approvingId === p.id}
                        className="ui-press bg-[#5951ff] hover:bg-[#4640e0] disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded">
                        {approvingId === p.id ? "Sending…" : "Approve"}
                      </button>
                    ) : activeStage === "research" ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-600 text-xs font-bold"><Loader2 className="w-3 h-3 animate-spin" /> Scraping…</span>
                    ) : activeStage === "await" ? (
                      <span className="inline-flex items-center gap-1.5 text-[#a099b4] text-xs font-bold"><Clock className="w-3 h-3" /> Standby</span>
                    ) : activeStage === "won" ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Engaged</span>
                    ) : (
                      <span className="text-xs font-bold text-[#a099b4]">Queued</span>
                    )}
                  </div>
                </div>
              ))}
              {stageLeads.length === 0 && <p className="text-xs text-[#a099b4] text-center py-8">Nothing here — launch a campaign above.</p>}
            </div>
          </div>
        </section>

        {/* Right rail: meetings + activity */}
        <aside className="space-y-6">
          <section className="bg-[#120044] rounded-lg p-5 text-white">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              <h2 className="text-sm font-bold">Meetings booked</h2>
              <span className="tnum ml-auto text-xs bg-white/15 px-2 py-0.5 rounded-full">{meetings.length}</span>
            </div>
            {meetings.length === 0 ? (
              <p className="text-sm text-white/60 mt-3 leading-relaxed">Agreed calls land here with company, time, interest + join link.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {meetings.map((m: any) => (
                  <div key={m.id} className="bg-white/10 rounded p-3">
                    <p className="text-sm font-bold">{m.company}</p>
                    <p className="text-xs text-white/60 mt-0.5">{m.time}</p>
                    {m.interest && <p className="text-xs text-emerald-300 mt-0.5">{m.interest}</p>}
                    <a href={m.link} target="_blank" rel="noreferrer" className="ui-press inline-block mt-2 bg-white text-[#120044] text-xs font-bold px-3 py-1.5 rounded">
                      Join call
                    </a>
                    {m.status !== "DONE" && (
                      <button onClick={() => markWon(m.id)}
                        className="ui-press inline-block mt-2 ml-2 border border-emerald-300 text-emerald-200 hover:bg-white/10 text-xs font-bold px-3 py-1.5 rounded">
                        Won + ₹
                      </button>
                    )}
                    {m.status === "DONE" && (
                      <span className="inline-block mt-2 ml-2 text-xs font-bold text-emerald-300">Won ✓</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-[#e4e1f5] rounded-lg p-5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#5951ff]" />
              <h2 className="text-sm font-bold text-[#120044]">Agent status</h2>
            </div>
            <div className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#4c4480] flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp</span>
                <span className={`text-xs font-bold ${waConnected ? 'text-emerald-600' : 'text-[#a099b4]'}`}>{waConnected ? 'Linked' : 'Not linked'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#4c4480] flex items-center gap-2"><Send className="w-3.5 h-3.5" /> Outreach</span>
                <span className="tnum text-xs font-bold text-[#120044]">{data?.metrics.outreach_ready || 0} ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#4c4480] flex items-center gap-2"><Search className="w-3.5 h-3.5" /> Discovery</span>
                <span className="text-xs font-bold text-[#120044]">Autonomous</span>
              </div>
            </div>
            {!waConnected && (
              <button onClick={() => setShowQRModal(true)} className="ui-press mt-4 w-full border border-[#5951ff] text-[#5951ff] hover:bg-[#efedff] text-xs font-bold py-2 rounded">
                Link WhatsApp
              </button>
            )}
          </section>

          {muted.length > 0 && (
          <section className="bg-white border border-[#e4e1f5] rounded-lg p-5">
            <h2 className="text-sm font-bold text-[#120044]">AI paused chats</h2>
            <p className="text-xs text-[#4c4480] mt-1">You took over — resume when ready.</p>
            <div className="mt-3 space-y-2">
              {muted.map((m: any) => (
                <div key={m.sender_phone} className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#120044] truncate">{m.company}</p>
                  <button onClick={() => resumeChat(m.sender_phone)}
                    className="ui-press shrink-0 border border-emerald-500 text-emerald-700 hover:bg-[#ecfdf5] text-[11px] font-bold px-3 py-1 rounded">
                    Resume AI
                  </button>
                </div>
              ))}
            </div>
          </section>
          )}
        </aside>
      </div>

      {/* Business profile + industry templates */}
      <section className="bg-white border border-[#e4e1f5] rounded-lg p-5 mt-6">
        <h2 className="text-base font-bold text-[#120044]">Your business</h2>
        <p className="text-xs text-[#4c4480] mt-1">The AI receptionist answers ONLY from this. Empty pricing = it never quotes prices.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs font-bold text-[#4c4480] self-center">Start from:</span>
          {(templates.length ? templates : [{ id: "dental", label: "Dental clinic" }, { id: "salon", label: "Salon & spa" }, { id: "real_estate", label: "Real estate" }, { id: "coaching", label: "Coaching" }, { id: "restaurant", label: "Restaurant" }]).map((t: any) => (
            <button key={t.id} onClick={() => applyTemplate(t.id)}
              className="ui-press border border-[#e4e1f5] hover:border-[#5951ff] hover:text-[#5951ff] text-xs font-bold px-3 py-1.5 rounded">
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <label className="block text-xs font-semibold text-[#4c4480]">Business name
            <input value={profile.business_name || ""} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
              className="mt-1 w-full bg-white border border-[#e4e1f5] rounded px-3 py-2 text-sm text-[#120044] focus:outline-none focus:border-[#5951ff]" /></label>
          <label className="block text-xs font-semibold text-[#4c4480]">Hours
            <input value={profile.hours || ""} onChange={(e) => setProfile({ ...profile, hours: e.target.value })} placeholder="Mon-Sat 10am-8pm"
              className="mt-1 w-full bg-white border border-[#e4e1f5] rounded px-3 py-2 text-sm text-[#120044] focus:outline-none focus:border-[#5951ff]" /></label>
          <label className="block text-xs font-semibold text-[#4c4480]">Avg deal (₹, for pipeline math)
            <input value={profile.avg_deal_inr || 5000} onChange={(e) => setProfile({ ...profile, avg_deal_inr: e.target.value })}
              className="mt-1 w-full bg-white border border-[#e4e1f5] rounded px-3 py-2 text-sm text-[#120044] focus:outline-none focus:border-[#5951ff]" /></label>
        </div>
        <label className="block text-xs font-semibold text-[#4c4480] mt-3">Services (one per line)
          <textarea value={profile.services || ""} onChange={(e) => setProfile({ ...profile, services: e.target.value })} rows={3}
            className="mt-1 w-full bg-white border border-[#e4e1f5] rounded px-3 py-2 text-sm text-[#120044] focus:outline-none focus:border-[#5951ff]" /></label>
        <label className="block text-xs font-semibold text-[#4c4480] mt-3">Pricing (leave empty = AI never quotes)
          <textarea value={profile.pricing || ""} onChange={(e) => setProfile({ ...profile, pricing: e.target.value })} rows={2}
            className="mt-1 w-full bg-white border border-[#e4e1f5] rounded px-3 py-2 text-sm text-[#120044] focus:outline-none focus:border-[#5951ff]" /></label>
        <button onClick={saveProfile} disabled={savingProfile}
          className="ui-press mt-4 bg-[#5951ff] hover:bg-[#4640e0] disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded flex items-center gap-2">
          {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save business
        </button>
      </section>

      <footer className="flex items-center gap-2 px-1 pt-2 text-xs text-[#a099b4]">
          <Search className="w-3.5 h-3.5" />
          DashWin finds public business contacts, verifies WhatsApp, and drafts outreach for your approval.
      </footer>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-[#120044] text-white text-sm font-semibold px-5 py-3 rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}
