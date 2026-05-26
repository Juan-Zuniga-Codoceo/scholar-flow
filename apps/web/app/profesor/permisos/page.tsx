"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft, ChevronRight, X, Clock, Calendar, FileText,
    CheckCircle, AlertCircle, Loader2, Plus, Save, Edit3
} from "lucide-react";
import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                   "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const TYPE_LABELS: Record<string, string> = {
    dia_admin:   "🗓️ Día Administrativo",
    horas_admin: "⏰ Horas Administrativas",
    permiso:     "📋 Permiso Especial",
};

const STATUS_STYLE: Record<string, string> = {
    pending:  "bg-amber-400",
    approved: "bg-emerald-500",
    rejected: "bg-red-400",
};

interface LeaveRequest {
    id: string;
    request_type: string;
    requested_date: string;
    start_time?: string | null;
    end_time?: string | null;
    reason?: string | null;
    status: string;
    admin_comment?: string | null;
    created_at: string;
}

interface Stats { pending: number; approved: number; rejected: number; approved_dias: number; }

export default function ProfesorCalendarioPage() {
    const router = useRouter();
    const today = new Date();
    const [year,  setYear]  = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [stats,    setStats]    = useState<Stats | null>(null);
    const [loading,  setLoading]  = useState(true);

    // Modal state
    const [showModal, setShowModal]   = useState(false);
    const [selDate,   setSelDate]     = useState("");
    const [reqType,   setReqType]     = useState("dia_admin");
    const [startTime, setStartTime]   = useState("08:00");
    const [endTime,   setEndTime]     = useState("10:00");
    const [reason,    setReason]      = useState("");
    const [saving,    setSaving]      = useState(false);
    const [saveError, setSaveError]   = useState<string | null>(null);
    const [success,   setSuccess]     = useState(false);

    const fetchAll = useCallback(async () => {
        const token = getToken();
        if (!token) { router.replace("/login"); return; }
        try {
            const [rRes, sRes] = await Promise.all([
                fetch(`${API}/leave-requests`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/leave-requests/stats`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            if (rRes.ok) setRequests(await rRes.json());
            if (sRes.ok) setStats(await sRes.json());
        } catch {}
        finally { setLoading(false); }
    }, [router]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Map requests to dates for quick lookup
    const dateMap: Record<string, LeaveRequest> = {};
    requests.forEach(r => { dateMap[r.requested_date] = r; });

    // Calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
    const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

    const openModal = (d: number) => {
        const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const existing = dateMap[dateStr];
        if (existing) return; // already has request
        setSelDate(dateStr); setReqType("dia_admin"); setReason("");
        setStartTime("08:00"); setEndTime("10:00"); setSaveError(null); setSuccess(false);
        setShowModal(true);
    };

    const handleSave = async () => {
        const token = getToken();
        if (!token) return;
        setSaving(true); setSaveError(null);
        try {
            const body: Record<string, any> = { request_type: reqType, requested_date: selDate, reason };
            if (reqType === "horas_admin") { body.start_time = startTime; body.end_time = endTime; }
            const res = await fetch(`${API}/leave-requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Error al enviar solicitud");
            setSuccess(true);
            await fetchAll();
            setTimeout(() => { setShowModal(false); setSuccess(false); }, 1800);
        } catch (e: any) { setSaveError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
            <div className="mb-8">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">Portal Docente</span>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2.5">
                    Permisos y Ausencias <Calendar className="w-7 h-7 text-blue-500" />
                </h1>
                <p className="text-slate-400 text-sm mt-1">Haz clic en un día para solicitar un permiso administrativo.</p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: "Pendientes",  val: stats.pending,  color: "text-amber-600",  bg: "bg-amber-50  border-amber-100" },
                        { label: "Aprobadas",   val: stats.approved, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
                        { label: "Rechazadas",  val: stats.rejected, color: "text-red-600",     bg: "bg-red-50    border-red-100" },
                        { label: "Días Admin",  val: stats.approved_dias, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
                    ].map(s => (
                        <div key={s.label} className={`p-4 rounded-2xl border ${s.bg} flex flex-col`}>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
                            <span className={`text-3xl font-black mt-1 ${s.color}`}>{s.val}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    {/* Nav */}
                    <div className="flex items-center justify-between mb-5">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ChevronLeft className="w-5 h-5 text-slate-500" />
                        </button>
                        <h2 className="font-black text-slate-900 text-lg">
                            {MONTHS_ES[month]} {year}
                        </h2>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-2">
                        {DAYS_ES.map(d => (
                            <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-1">{d}</div>
                        ))}
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDay }, (_, i) => (
                            <div key={`e-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const d = i + 1;
                            const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                            const req = dateMap[dateStr];
                            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
                            const isPast  = new Date(dateStr) < new Date(today.toDateString());
                            const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

                            return (
                                <button
                                    key={d}
                                    onClick={() => !isPast && !isWeekend && openModal(d)}
                                    disabled={isPast || isWeekend}
                                    className={`
                                        relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all
                                        ${isToday ? "ring-2 ring-blue-500 ring-offset-1" : ""}
                                        ${isWeekend ? "opacity-30 cursor-default" : ""}
                                        ${isPast && !isWeekend ? "opacity-40 cursor-default" : ""}
                                        ${req ? "" : !isPast && !isWeekend ? "hover:bg-blue-50 cursor-pointer" : ""}
                                        ${req?.status === "pending"  ? "bg-amber-50  text-amber-700"   : ""}
                                        ${req?.status === "approved" ? "bg-emerald-50 text-emerald-700" : ""}
                                        ${req?.status === "rejected" ? "bg-red-50    text-red-700"     : ""}
                                        ${!req ? "text-slate-700" : ""}
                                    `}
                                >
                                    {d}
                                    {req && (
                                        <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${STATUS_STYLE[req.status]}`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-50">
                        {[["bg-amber-400","Pendiente"],["bg-emerald-500","Aprobado"],["bg-red-400","Rechazado"]].map(([c,l]) => (
                            <div key={l} className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                                <span className={`w-2.5 h-2.5 rounded-full ${c}`} /> {l}
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold ml-auto">
                            <Plus className="w-3 h-3" /> Clic para solicitar
                        </div>
                    </div>
                </div>

                {/* Request list */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 max-h-[520px] overflow-y-auto">
                    <h3 className="font-bold text-slate-900 text-sm sticky top-0 bg-white pb-2">Mis Solicitudes</h3>
                    {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-400 mx-auto" />}
                    {!loading && requests.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-8">Sin solicitudes. Haz clic en un día del calendario.</p>
                    )}
                    {requests.map(r => (
                        <div key={r.id} className={`p-3 rounded-xl border text-xs ${
                            r.status === "pending"  ? "bg-amber-50  border-amber-100"   :
                            r.status === "approved" ? "bg-emerald-50 border-emerald-100" :
                            "bg-red-50 border-red-100"
                        }`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-black text-slate-800">{r.requested_date}</span>
                                <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${
                                    r.status === "pending"  ? "bg-amber-200  text-amber-800"   :
                                    r.status === "approved" ? "bg-emerald-200 text-emerald-800" :
                                    "bg-red-200 text-red-800"
                                }`}>{r.status}</span>
                            </div>
                            <p className="text-slate-600 font-semibold">{TYPE_LABELS[r.request_type]}</p>
                            {r.reason && <p className="text-slate-400 mt-0.5 truncate">{r.reason}</p>}
                            {r.admin_comment && (
                                <p className="mt-1 text-slate-500 italic border-t border-current/10 pt-1">
                                    💬 {r.admin_comment}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── New Request Modal ─────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Nueva Solicitud</p>
                                    <h3 className="text-xl font-black mt-0.5">{selDate}</h3>
                                </div>
                                <button onClick={() => setShowModal(false)} className="text-blue-200 hover:text-white p-1 hover:bg-white/10 rounded-xl">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {success ? (
                                <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-bold">
                                    <CheckCircle className="w-5 h-5" /> ¡Solicitud enviada!
                                </div>
                            ) : (
                                <>
                                    {saveError && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold">
                                            <AlertCircle className="w-4 h-4" /> {saveError}
                                        </div>
                                    )}
                                    {/* Type */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Permiso</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {Object.entries(TYPE_LABELS).map(([v, l]) => (
                                                <button
                                                    key={v}
                                                    onClick={() => setReqType(v)}
                                                    className={`p-2 rounded-xl border text-[10px] font-bold transition-all text-center ${
                                                        reqType === v
                                                            ? "bg-blue-600 text-white border-blue-600"
                                                            : "bg-slate-50 text-slate-600 border-slate-100 hover:border-blue-200"
                                                    }`}
                                                >
                                                    {l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Times (only for horas_admin) */}
                                    {reqType === "horas_admin" && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Desde</label>
                                                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hasta</label>
                                                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Reason */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Motivo</label>
                                        <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                                            placeholder="Describe brevemente el motivo..."
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                                    </div>

                                    <button onClick={handleSave} disabled={saving}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 disabled:opacity-50 transition-all">
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {saving ? "Enviando..." : "Enviar Solicitud"}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
