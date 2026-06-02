"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Edit2, Trash2, CheckCircle2, XCircle, AlertCircle, Sparkles, Eye, Mail, Phone, Clock, Award, UserPlus, X, Loader2 } from "lucide-react";
import { getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Professor {
    id: string;
    rut: string;
    full_name: string;
    subjects: string[];
    contract_hours: number;
    assigned_hours: number;
    contract_type: "planta" | "reemplazo" | "honorarios";
    is_available: boolean;
    email?: string;
    phone?: string;
    parent_attention_hours?: string;
}

function ProfessorsPageContent() {
    const searchParams = useSearchParams();
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProf, setEditingProf] = useState<Professor | null>(null);
    const [viewingProf, setViewingProf] = useState<Professor | null>(null);

    // Form fields
    const [rut, setRut] = useState("");
    const [fullName, setFullName] = useState("");
    const [subjectsStr, setSubjectsStr] = useState("");
    const [contractHours, setContractHours] = useState(44);
    const [contractType, setContractType] = useState<"planta" | "reemplazo" | "honorarios">("planta");
    const [assignedHours, setAssignedHours] = useState(0);
    const [isAvailable, setIsAvailable] = useState(true);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [parentAttentionHours, setParentAttentionHours] = useState("");

    // Invite to portal modal
    const [inviteProf, setInviteProf]       = useState<Professor | null>(null);
    const [inviteEmail, setInviteEmail]     = useState("");
    const [invitePass, setInvitePass]       = useState("");
    const [inviting, setInviting]           = useState(false);
    const [inviteError, setInviteError]     = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    const handleInvite = async () => {
        if (!inviteProf) return;
        setInviting(true); setInviteError(null);
        try {
            const token = getToken();
            const res = await fetch(`${API_URL}/auth/invite-professor`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ professor_id: inviteProf.id, email: inviteEmail, password: invitePass }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Error al invitar");
            setInviteSuccess(true);
            setTimeout(() => { setInviteProf(null); setInviteSuccess(false); setInviteEmail(""); setInvitePass(""); }, 2000);
        } catch (e: any) {
            setInviteError(e.message);
        } finally {
            setInviting(false);
        }
    };

    const fetchProfessors = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/professors`);
            if (!res.ok) throw new Error("Error al cargar la nómina de profesores");
            const data = await res.json();
            setProfessors(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfessors();
    }, []);

    // Auto-open professor profile if query param matches
    useEffect(() => {
        const view = searchParams.get("view");
        if (view && professors.length > 0) {
            const found = professors.find(p => 
                p.id === view || 
                p.rut.replace(/\./g, "").toUpperCase() === view.replace(/\./g, "").toUpperCase() || 
                p.full_name.toLowerCase().includes(view.toLowerCase())
            );
            if (found) {
                setViewingProf(found);
            }
        }
    }, [professors, searchParams]);

    const openCreateModal = () => {
        setEditingProf(null);
        setRut("");
        setFullName("");
        setSubjectsStr("");
        setContractHours(44);
        setContractType("planta");
        setAssignedHours(0);
        setIsAvailable(true);
        setEmail("");
        setPhone("");
        setParentAttentionHours("");
        setIsModalOpen(true);
    };

    const openEditModal = (prof: Professor) => {
        setEditingProf(prof);
        setRut(prof.rut);
        setFullName(prof.full_name);
        setSubjectsStr(prof.subjects.join(", "));
        setContractHours(prof.contract_hours);
        setContractType(prof.contract_type);
        setAssignedHours(prof.assigned_hours);
        setIsAvailable(prof.is_available);
        setEmail(prof.email || "");
        setPhone(prof.phone || "");
        setParentAttentionHours(prof.parent_attention_hours || "");
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const subjects = subjectsStr
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        const payload = {
            rut,
            full_name: fullName,
            subjects,
            contract_hours: Number(contractHours),
            contract_type: contractType,
            assigned_hours: Number(assignedHours),
            is_available: isAvailable,
            email: email || null,
            phone: phone || null,
            parent_attention_hours: parentAttentionHours || null,
        };

        try {
            let res;
            if (editingProf) {
                // Update
                res = await fetch(`${API_URL}/professors/${editingProf.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                // Create
                res = await fetch(`${API_URL}/professors`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Error al guardar profesor");
            }

            setIsModalOpen(false);
            fetchProfessors();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este profesor de la nómina?")) return;
        try {
            const res = await fetch(`${API_URL}/professors/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Error al eliminar profesor");
            fetchProfessors();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const toggleAvailability = async (prof: Professor) => {
        try {
            const res = await fetch(`${API_URL}/professors/${prof.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_available: !prof.is_available }),
            });
            if (!res.ok) throw new Error("Error al cambiar disponibilidad");
            fetchProfessors();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const filteredProfessors = professors.filter((p) => {
        const query = searchQuery.toLowerCase();
        return (
            p.full_name.toLowerCase().includes(query) ||
            p.rut.toLowerCase().includes(query) ||
            p.subjects.some((s) => s.toLowerCase().includes(query))
        );
    });

    return (
        <div className="min-h-screen bg-slate-50/50 bg-notebook-grid p-6 md:p-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        Nómina de Profesores <Sparkles className="w-6 h-6 text-blue-500 animate-pulse" />
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Administra los docentes del colegio, su carga horaria semanal y especialidades.
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all duration-200"
                >
                    <Plus className="w-5 h-5" />
                    Agregar Profesor
                </button>
            </div>

            {/* Actions / Filter bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-4 mb-6">
                <div className="relative w-full md:w-80">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, RUT o ramo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 ml-auto font-medium">
                    <span>Docentes totales: {filteredProfessors.length}</span>
                </div>
            </div>

            {/* Table / Content */}
            {loading && professors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                    <span className="text-sm text-slate-500 font-medium">Cargando docentes...</span>
                </div>
            ) : error ? (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            ) : filteredProfessors.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900">No se encontraron profesores</h3>
                    <p className="text-slate-500 text-sm mt-1">Prueba refinando tu búsqueda o agrega un nuevo profesor.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Profesor</th>
                                    <th className="px-6 py-4 font-semibold">RUT</th>
                                    <th className="px-6 py-4 font-semibold">Asignaturas</th>
                                    <th className="px-6 py-4 font-semibold">Contrato</th>
                                    <th className="px-6 py-4 font-semibold">Carga Horaria</th>
                                    <th className="px-6 py-4 font-semibold text-center">Disponible</th>
                                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProfessors.map((p) => {
                                    const availableHours = p.contract_hours - p.assigned_hours;
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">{p.full_name}</td>
                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{p.rut}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {p.subjects.length > 0 ? (
                                                        p.subjects.map((sub, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-md border border-blue-100/50"
                                                            >
                                                                {sub}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Ninguna</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 capitalize">
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                        p.contract_type === "planta"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                            : p.contract_type === "reemplazo"
                                                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                                                            : "bg-amber-50 text-amber-700 border border-amber-100"
                                                    }`}
                                                >
                                                    {p.contract_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <span className="font-semibold text-slate-800">{p.assigned_hours}</span>
                                                <span className="text-slate-400"> / {p.contract_hours} hrs</span>
                                                <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            availableHours < 0
                                                                ? "bg-red-500"
                                                                : availableHours === 0
                                                                ? "bg-amber-500"
                                                                : "bg-blue-500"
                                                        }`}
                                                        style={{
                                                            width: `${Math.min(100, (p.assigned_hours / p.contract_hours) * 100)}%`,
                                                        }}
                                                    ></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => toggleAvailability(p)}
                                                    className="focus:outline-none transition-transform active:scale-95"
                                                >
                                                    {p.is_available ? (
                                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                                                    ) : (
                                                        <XCircle className="w-6 h-6 text-slate-300 mx-auto" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setViewingProf(p)}
                                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                        title="Ver Ficha"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setInviteProf(p); setInviteEmail(""); setInvitePass(""); setInviteError(null); setInviteSuccess(false); }}
                                                        className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                                                        title="Invitar al Portal"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(p)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Agregar / Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-slate-900">
                                {editingProf ? "Editar Profesor" : "Agregar Nuevo Profesor"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200/50 rounded-lg transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        RUT (Ej: 12.345.678-9)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={rut}
                                        onChange={(e) => setRut(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Nombre Completo
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="correo@ejemplo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="+56 9 1234 5678"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Asignaturas (separadas por coma)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Matemáticas, Física, Álgebra"
                                    value={subjectsStr}
                                    onChange={(e) => setSubjectsStr(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Horas de Atención a Apoderados (Requerido)
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Lunes 15:30 - 16:30, Miércoles 09:00 - 10:00"
                                    value={parentAttentionHours}
                                    onChange={(e) => setParentAttentionHours(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Tipo Contrato
                                    </label>
                                    <select
                                        value={contractType}
                                        onChange={(e) => setContractType(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    >
                                        <option value="planta">Planta</option>
                                        <option value="reemplazo">Reemplazo</option>
                                        <option value="honorarios">Honorarios</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Horas Contrato
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        value={contractHours}
                                        onChange={(e) => setContractHours(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Horas Asignadas
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={assignedHours}
                                        onChange={(e) => setAssignedHours(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isAvailable"
                                    checked={isAvailable}
                                    onChange={(e) => setIsAvailable(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="isAvailable" className="text-sm font-medium text-slate-700">
                                    ¿Está disponible para reemplazos inmediatos?
                                </label>
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-sm hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/10 transition-colors"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Ficha de Profesor */}
            {viewingProf && (() => {
                const pct = viewingProf.contract_hours > 0
                    ? Math.round((viewingProf.assigned_hours / viewingProf.contract_hours) * 100)
                    : 0;
                const initials = viewingProf.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);
                const contractColors: Record<string, string> = {
                    planta: "bg-emerald-50 text-emerald-700 border-emerald-100",
                    reemplazo: "bg-purple-50 text-purple-700 border-purple-100",
                    honorarios: "bg-amber-50 text-amber-700 border-amber-100",
                };
                const stroke = 2 * Math.PI * 40;
                const offset = stroke - (stroke * pct) / 100;
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Banner */}
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white flex items-center gap-5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-notebook-grid opacity-5"></div>
                                <div className="relative w-20 h-20 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-3xl font-black flex-shrink-0">
                                    {initials}
                                </div>
                                <div className="relative">
                                    <h3 className="text-xl font-black tracking-tight">{viewingProf.full_name}</h3>
                                    <p className="text-slate-300 text-xs font-mono mt-1">{viewingProf.rut}</p>
                                    <span className={`mt-2 inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${contractColors[viewingProf.contract_type]}`}>
                                        {viewingProf.contract_type}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setViewingProf(null)}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-5">
                                {/* Carga Horaria */}
                                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="relative flex-shrink-0">
                                        <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                                            <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                                            <circle
                                                cx="50" cy="50" r="40" fill="none"
                                                stroke={pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#3b82f6"}
                                                strokeWidth="8"
                                                strokeDasharray={stroke}
                                                strokeDashoffset={offset}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-xl font-black text-slate-900">{pct}%</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">Carga</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" /> Horas de Contrato
                                        </p>
                                        <p className="text-2xl font-black text-slate-900">{viewingProf.assigned_hours}<span className="text-base font-semibold text-slate-400">/{viewingProf.contract_hours} hrs</span></p>
                                        <p className="text-xs text-slate-400 font-medium">
                                            {viewingProf.contract_hours - viewingProf.assigned_hours} horas disponibles
                                        </p>
                                    </div>
                                </div>

                                {/* Información de Contacto */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                            <Mail className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">Email</span>
                                            <span className="font-bold text-slate-800 text-xs truncate block" title={viewingProf.email || "No registrado"}>
                                                {viewingProf.email || "No registrado"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <Phone className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider">Teléfono</span>
                                            <span className="font-bold text-slate-800 text-xs block">
                                                {viewingProf.phone || "No registrado"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Horas de Atención a Apoderados */}
                                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Clock className="w-4 h-4 text-amber-700" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-amber-800 block text-[9px] font-black uppercase tracking-wider">Atención a Apoderados</span>
                                        <span className="font-bold text-slate-800 text-xs block mt-1 leading-relaxed">
                                            {viewingProf.parent_attention_hours || "No registrado"}
                                        </span>
                                    </div>
                                </div>

                                {/* Especialidades */}
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                        <Award className="w-3.5 h-3.5" /> Especialidades
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {viewingProf.subjects.length > 0 ? viewingProf.subjects.map((sub: string, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-100">
                                                {sub}
                                            </span>
                                        )) : (
                                            <span className="text-xs text-slate-400 italic">Sin especialidades registradas</span>
                                        )}
                                    </div>
                                </div>

                                {/* Disponibilidad */}
                                <div className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-semibold ${
                                    viewingProf.is_available
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : "bg-slate-50 text-slate-500 border-slate-100"
                                }`}>
                                    <CheckCircle2 className="w-5 h-5" />
                                    {viewingProf.is_available ? "Disponible para reemplazos" : "No disponible para reemplazos"}
                                </div>

                                <button
                                    onClick={() => { setViewingProf(null); openEditModal(viewingProf); }}
                                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:-translate-y-0.5 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    <Edit2 className="w-4 h-4" /> Editar Ficha del Docente
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Modal: Invitar al Portal ──────────────────── */}
            {inviteProf && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white relative overflow-hidden">
                            <div className="absolute inset-0 bg-notebook-grid opacity-10" />
                            <div className="relative flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold text-violet-200 uppercase tracking-wider">Portal Docente</p>
                                    <h3 className="text-lg font-black mt-0.5">Invitar al Portal</h3>
                                    <p className="text-violet-200 text-sm mt-0.5">{inviteProf.full_name}</p>
                                </div>
                                <button onClick={() => setInviteProf(null)} className="text-violet-200 hover:text-white p-1 hover:bg-white/10 rounded-xl">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {inviteSuccess ? (
                                <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-bold">
                                    <CheckCircle2 className="w-5 h-5" /> ¡Cuenta creada exitosamente!
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-slate-500">
                                        Crea las credenciales de acceso para que el profesor pueda iniciar sesión en el Portal Docente.
                                    </p>
                                    {inviteError && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold">
                                            <AlertCircle className="w-4 h-4" /> {inviteError}
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correo de acceso</label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            placeholder="profesor@institucion.cl"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contraseña temporal</label>
                                        <input
                                            type="password"
                                            value={invitePass}
                                            onChange={e => setInvitePass(e.target.value)}
                                            minLength={6}
                                            placeholder="Mín. 6 caracteres"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                        />
                                    </div>
                                    <button
                                        onClick={handleInvite}
                                        disabled={inviting || !inviteEmail || !invitePass}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-violet-500/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                        {inviting ? "Creando cuenta..." : "Crear Acceso"}
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

export default function ProfessorsPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <span className="text-sm text-slate-500 font-medium">Cargando nómina...</span>
            </div>
        }>
            <ProfessorsPageContent />
        </Suspense>
    );
}
