"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    User, Mail, Phone, FileText, Save, CheckCircle, AlertCircle,
    BookOpen, Clock, Briefcase, Loader2, Edit3, X
} from "lucide-react";
import { getToken, getUser } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ProfessorProfile {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    bio?: string | null;
    rut: string;
    subjects: string[];
    contract_type: string;
    contract_hours: number;
    assigned_hours: number;
    is_available: boolean;
    organization: { id: string; name: string; subdomain: string };
}

const CONTRACT_LABELS: Record<string, string> = {
    planta: "Planta",
    reemplazo: "Reemplazo",
    honorarios: "Honorarios",
};

export default function ProfesorPerfilPage() {
    const router = useRouter();
    const [profile, setProfile]   = useState<ProfessorProfile | null>(null);
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [editing, setEditing]   = useState(false);
    const [success, setSuccess]   = useState(false);
    const [error, setError]       = useState<string | null>(null);

    // Editable fields
    const [form, setForm] = useState({ full_name: "", email: "", phone: "", bio: "" });

    const fetchProfile = async () => {
        const token = getToken();
        if (!token) { router.replace("/login"); return; }
        try {
            const res = await fetch(`${API}/professor/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) { router.replace("/login"); return; }
            if (!res.ok) throw new Error("Error al cargar perfil");
            const data: ProfessorProfile = await res.json();
            setProfile(data);
            setForm({
                full_name: data.full_name,
                email: data.email,
                phone: data.phone || "",
                bio: data.bio || "",
            });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProfile(); }, []);

    const handleSave = async () => {
        const token = getToken();
        if (!token || !profile) return;
        setSaving(true);
        setError(null);
        try {
            const payload: Record<string, string | null> = {};
            if (form.full_name !== profile.full_name) payload.full_name = form.full_name;
            if (form.email !== profile.email) payload.email = form.email;
            payload.phone = form.phone || null;
            payload.bio   = form.bio   || null;

            const res = await fetch(`${API}/professor/me`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Error al guardar"); }
            await fetchProfile();
            setEditing(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const initials = profile
        ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
        : "?";

    // Completion percentage for profile fields
    const filled = profile
        ? [profile.full_name, profile.email, profile.phone, profile.bio].filter(Boolean).length
        : 0;
    const completionPct = Math.round((filled / 4) * 100);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 bg-notebook-grid p-6 md:p-8 font-sans">
            {/* Header */}
            <div className="mb-8">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">Portal Docente</span>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2">Mi Perfil</h1>
                <p className="text-slate-400 text-sm mt-1">Actualiza tu información de contacto y datos profesionales.</p>
            </div>

            {/* Success / Error banners */}
            {success && (
                <div className="flex items-center gap-2.5 p-3.5 mb-6 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold">
                    <CheckCircle className="w-4 h-4" /> Perfil actualizado correctamente.
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2.5 p-3.5 mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT: Avatar + stats ─────────────────────── */}
                <div className="space-y-5">
                    {/* Avatar card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black mx-auto shadow-lg shadow-blue-500/25 mb-4">
                            {initials}
                        </div>
                        <h2 className="text-lg font-black text-slate-900">{profile?.full_name}</h2>
                        <p className="text-sm text-slate-400 mt-0.5">{profile?.email}</p>
                        <div className="mt-3">
                            <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                                profile?.contract_type === "planta"
                                    ? "bg-blue-100 text-blue-700"
                                    : profile?.contract_type === "honorarios"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-slate-100 text-slate-600"
                            }`}>
                                {CONTRACT_LABELS[profile?.contract_type || ""] || profile?.contract_type}
                            </span>
                        </div>
                    </div>

                    {/* Stats card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contrato</p>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs text-slate-500">
                                    <Clock className="w-3.5 h-3.5 text-blue-400" /> Horas contrato
                                </span>
                                <span className="text-sm font-bold text-slate-800">{profile?.contract_hours} h</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-xs text-slate-500">
                                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Horas asignadas
                                </span>
                                <span className="text-sm font-bold text-slate-800">{profile?.assigned_hours} h</span>
                            </div>
                            {/* Load bar */}
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                    <span>Carga horaria</span>
                                    <span>{profile?.contract_hours ? Math.round(((profile?.assigned_hours || 0) / profile.contract_hours) * 100) : 0}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                                        style={{ width: `${profile?.contract_hours ? Math.min(100, Math.round(((profile?.assigned_hours || 0) / profile.contract_hours) * 100)) : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Especialidades</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(profile?.subjects || []).map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100">
                                        {s}
                                    </span>
                                ))}
                                {(!profile?.subjects?.length) && <span className="text-[10px] text-slate-400">Sin especialidades registradas</span>}
                            </div>
                        </div>
                    </div>

                    {/* Profile completeness */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Perfil completo</p>
                            <span className="text-sm font-black text-blue-600">{completionPct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${completionPct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`}
                                style={{ width: `${completionPct}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            {completionPct < 100 ? "Completa tu teléfono y biografía para un perfil completo." : "¡Perfil completo!"}
                        </p>
                    </div>
                </div>

                {/* ── RIGHT: Edit form ──────────────────────────── */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-900">Información Personal</h3>
                            {!editing ? (
                                <button
                                    onClick={() => setEditing(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-100 transition-all"
                                >
                                    <Edit3 className="w-3.5 h-3.5" /> Editar
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setEditing(false); setError(null); }}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
                                >
                                    <X className="w-3.5 h-3.5" /> Cancelar
                                </button>
                            )}
                        </div>

                        <div className="space-y-5">
                            {/* Full name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Nombre Completo
                                </label>
                                {editing ? (
                                    <input
                                        type="text"
                                        value={form.full_name}
                                        onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                ) : (
                                    <p className="px-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800">{profile?.full_name}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" /> Correo Electrónico
                                </label>
                                {editing ? (
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                ) : (
                                    <p className="px-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800">{profile?.email}</p>
                                )}
                            </div>

                            {/* Phone */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5" /> Teléfono
                                </label>
                                {editing ? (
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                        placeholder="+56 9 XXXX XXXX"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                ) : (
                                    <p className={`px-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold ${profile?.phone ? "text-slate-800" : "text-slate-400 italic"}`}>
                                        {profile?.phone || "Sin teléfono registrado"}
                                    </p>
                                )}
                            </div>

                            {/* Bio */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" /> Biografía / Notas
                                </label>
                                {editing ? (
                                    <textarea
                                        rows={3}
                                        value={form.bio}
                                        onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                                        placeholder="Breve descripción profesional..."
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                    />
                                ) : (
                                    <p className={`px-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold ${profile?.bio ? "text-slate-800" : "text-slate-400 italic"}`}>
                                        {profile?.bio || "Sin biografía"}
                                    </p>
                                )}
                            </div>

                            {/* Read-only: RUT */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5" /> RUT
                                </label>
                                <p className="px-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold text-slate-500">
                                    {profile?.rut} <span className="text-[10px] ml-1 text-slate-300">(no editable)</span>
                                </p>
                            </div>
                        </div>

                        {editing && (
                            <div className="flex justify-end mt-6 pt-4 border-t border-slate-50">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? "Guardando..." : "Guardar Cambios"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
