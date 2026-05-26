"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar, CheckCircle2, XCircle, Clock, Loader2,
    AlertCircle, MessageSquare, Users, Filter, X
} from "lucide-react";
import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TYPE_LABELS: Record<string, string> = {
    dia_admin:   "Día Administrativo",
    horas_admin: "Horas Administrativas",
    permiso:     "Permiso Especial",
};
const TYPE_ICON: Record<string, string> = { dia_admin: "🗓️", horas_admin: "⏰", permiso: "📋" };

interface LeaveRequest {
    id: string;
    request_type: string;
    requested_date: string;
    start_time?: string | null;
    end_time?: string | null;
    reason?: string | null;
    status: string;
    professor_name: string;
    professor_id: string;
    admin_comment?: string | null;
    reviewed_by_name?: string | null;
    reviewed_at?: string | null;
    created_at: string;
}

interface Stats { pending: number; approved: number; rejected: number; approved_dias: number; }

export default function PermisosAdminPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [stats,    setStats]    = useState<Stats | null>(null);
    const [loading,  setLoading]  = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("pending");

    // Review modal
    const [reviewing,  setReviewing]  = useState<LeaveRequest | null>(null);
    const [decision,   setDecision]   = useState<"approved"|"rejected">("approved");
    const [comment,    setComment]    = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [reviewErr,  setReviewErr]  = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        const token = getToken();
        if (!token) { router.replace("/login"); return; }
        try {
            const params = statusFilter ? `?status=${statusFilter}` : "";
            const [rRes, sRes] = await Promise.all([
                fetch(`${API}/leave-requests${params}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/leave-requests/stats`,   { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            if (rRes.ok) setRequests(await rRes.json());
            if (sRes.ok) setStats(await sRes.json());
        } catch {}
        finally { setLoading(false); }
    }, [router, statusFilter]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleReview = async () => {
        if (!reviewing) return;
        const token = getToken();
        setSubmitting(true); setReviewErr(null);
        try {
            const res = await fetch(`${API}/leave-requests/${reviewing.id}/review`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: decision, admin_comment: comment || null }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Error al revisar");
            setReviewing(null); setComment("");
            await fetchAll();
        } catch (e: any) { setReviewErr(e.message); }
        finally { setSubmitting(false); }
    };

    const openReview = (r: LeaveRequest, d: "approved"|"rejected") => {
        setReviewing(r); setDecision(d); setComment(""); setReviewErr(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
            {/* Header */}
            <div className="mb-8">
                <span className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full uppercase tracking-wider">Administración</span>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2.5">
                    Solicitudes de Permiso <Calendar className="w-7 h-7 text-violet-500" />
                </h1>
                <p className="text-slate-400 text-sm mt-1">Revisa y aprueba o rechaza las solicitudes de los docentes.</p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: "Pendientes",  val: stats.pending,  color: "text-amber-600",   bg: "bg-amber-50  border-amber-100",   filter: "pending"  },
                        { label: "Aprobadas",   val: stats.approved, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", filter: "approved" },
                        { label: "Rechazadas",  val: stats.rejected, color: "text-red-600",     bg: "bg-red-50    border-red-100",     filter: "rejected" },
                        { label: "Días Admin",  val: stats.approved_dias, color: "text-blue-600", bg: "bg-blue-50 border-blue-100", filter: "" },
                    ].map(s => (
                        <button key={s.label} onClick={() => s.filter && setStatusFilter(s.filter)}
                            className={`p-4 rounded-2xl border ${s.bg} flex flex-col text-left transition-all ${s.filter && statusFilter === s.filter ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
                            <span className={`text-3xl font-black mt-1 ${s.color}`}>{s.val}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex items-center gap-2 mb-6">
                {[["pending","Pendientes"],["approved","Aprobadas"],["rejected","Rechazadas"],["","Todas"]].map(([f, l]) => (
                    <button key={f} onClick={() => setStatusFilter(f)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            statusFilter === f
                                ? "bg-slate-900 text-white shadow-md"
                                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                        }`}>
                        {l}
                    </button>
                ))}
            </div>

            {/* Request cards */}
            {loading && <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>}

            {!loading && requests.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                    <Calendar className="w-16 h-16 mx-auto text-slate-200 mb-3" />
                    <p className="font-bold text-slate-500">No hay solicitudes {statusFilter === "pending" ? "pendientes" : ""}</p>
                </div>
            )}

            <div className="space-y-3">
                {requests.map(r => (
                    <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                        <div className="flex items-start gap-4">
                            {/* Type icon */}
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                                r.status === "pending"  ? "bg-amber-50"   :
                                r.status === "approved" ? "bg-emerald-50" : "bg-red-50"
                            }`}>
                                {TYPE_ICON[r.request_type]}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div>
                                        <p className="font-black text-slate-900">{r.professor_name}</p>
                                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                            {TYPE_LABELS[r.request_type]} · {r.requested_date}
                                            {r.start_time && ` · ${r.start_time} – ${r.end_time}`}
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex-shrink-0 ${
                                        r.status === "pending"  ? "bg-amber-100  text-amber-700"   :
                                        r.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                                        "bg-red-100 text-red-700"
                                    }`}>{r.status}</span>
                                </div>

                                {r.reason && (
                                    <p className="mt-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                                        {r.reason}
                                    </p>
                                )}

                                {r.admin_comment && (
                                    <p className="mt-2 text-xs text-slate-500 flex items-start gap-1.5">
                                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                                        <span><span className="font-semibold">{r.reviewed_by_name}:</span> {r.admin_comment}</span>
                                    </p>
                                )}
                            </div>

                            {/* Actions (only for pending) */}
                            {r.status === "pending" && (
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => openReview(r, "approved")}
                                        className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs border border-emerald-100 transition-all">
                                        <CheckCircle2 className="w-4 h-4" /> Aprobar
                                    </button>
                                    <button onClick={() => openReview(r, "rejected")}
                                        className="flex items-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs border border-red-100 transition-all">
                                        <XCircle className="w-4 h-4" /> Rechazar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Review Modal ─────────────────────────────── */}
            {reviewing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                        <div className={`p-6 text-white ${decision === "approved" ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-gradient-to-br from-red-600 to-rose-700"}`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-white/70 uppercase tracking-wider">
                                        {decision === "approved" ? "Aprobar" : "Rechazar"} Solicitud
                                    </p>
                                    <h3 className="text-lg font-black mt-0.5">{reviewing.professor_name}</h3>
                                    <p className="text-white/70 text-sm">{reviewing.requested_date} · {TYPE_LABELS[reviewing.request_type]}</p>
                                </div>
                                <button onClick={() => setReviewing(null)} className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-xl">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {reviewErr && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold">
                                    <AlertCircle className="w-4 h-4" /> {reviewErr}
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comentario (opcional)</label>
                                <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
                                    placeholder="Agrega una nota para el docente..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400" />
                            </div>
                            <button onClick={handleReview} disabled={submitting}
                                className={`w-full flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 ${
                                    decision === "approved"
                                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20"
                                        : "bg-gradient-to-r from-red-600 to-rose-600 shadow-red-500/20"
                                }`}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                    decision === "approved" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {submitting ? "Guardando..." : decision === "approved" ? "Confirmar Aprobación" : "Confirmar Rechazo"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
