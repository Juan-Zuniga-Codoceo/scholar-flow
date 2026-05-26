"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Plus, Trash2, Edit2, CheckSquare, Square, Filter, Search,
    Calendar, Clock, Flag, AlertCircle, CheckCircle2, ListChecks,
    Loader2, X, ClipboardList, Info
} from "lucide-react";
import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AgendaItem {
    id: string;
    title: string;
    content?: string | null;
    category: "tarea" | "examen" | "reunion" | "recordatorio" | "otro";
    date: string;
    start_time?: string | null;
    priority: "low" | "medium" | "high";
    is_completed: boolean;
    created_at: string;
}

const CATEGORY_LABELS = {
    tarea: "Tarea",
    examen: "Examen",
    reunion: "Reunión",
    recordatorio: "Recordatorio",
    otro: "Otro"
};

const CATEGORY_STYLES = {
    tarea: "bg-blue-50 text-blue-700 border-blue-100",
    examen: "bg-amber-50 text-amber-700 border-amber-100",
    reunion: "bg-purple-50 text-purple-700 border-purple-100",
    recordatorio: "bg-pink-50 text-pink-700 border-pink-100",
    otro: "bg-slate-50 text-slate-700 border-slate-100"
};

const PRIORITY_STYLES = {
    low: "text-slate-400 bg-slate-100 border-slate-200",
    medium: "text-amber-600 bg-amber-50 border-amber-100",
    high: "text-rose-600 bg-rose-50 border-rose-100"
};

const PRIORITY_LABELS = {
    low: "Baja",
    medium: "Media",
    high: "Alta"
};

export default function ProfesorAgendaPage() {
    const router = useRouter();
    const [items, setItems]       = useState<AgendaItem[]>([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState<string | null>(null);

    // Filters
    const [search, setSearch]           = useState("");
    const [catFilter, setCatFilter]     = useState<string>("all");
    const [prioFilter, setPrioFilter]   = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Modal Control
    const [modalOpen, setModalOpen]     = useState(false);
    const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
    const [saving, setSaving]           = useState(false);

    // Form fields
    const [form, setForm] = useState({
        title: "",
        content: "",
        category: "tarea",
        date: "",
        start_time: "",
        priority: "medium"
    });

    const fetchAgenda = async () => {
        const token = getToken();
        if (!token) { router.replace("/login"); return; }
        try {
            const res = await fetch(`${API}/agenda`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401 || res.status === 403) { router.replace("/login"); return; }
            if (!res.ok) throw new Error("Error al obtener la agenda");
            const data: AgendaItem[] = await res.json();
            setItems(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgenda();
    }, []);

    const handleOpenCreate = () => {
        setEditingItem(null);
        // Default date to today in local YYYY-MM-DD
        const todayStr = new Date().toISOString().split("T")[0];
        setForm({
            title: "",
            content: "",
            category: "tarea",
            date: todayStr,
            start_time: "",
            priority: "medium"
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (item: AgendaItem) => {
        setEditingItem(item);
        setForm({
            title: item.title,
            content: item.content || "",
            category: item.category,
            date: item.date,
            start_time: item.start_time || "",
            priority: item.priority
        });
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = getToken();
        if (!token) return;
        setSaving(true);
        setError(null);

        const payload = {
            title: form.title,
            content: form.content || null,
            category: form.category,
            date: form.date,
            start_time: form.start_time || null,
            priority: form.priority
        };

        try {
            let res;
            if (editingItem) {
                // Update
                res = await fetch(`${API}/agenda/${editingItem.id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                // Create
                res = await fetch(`${API}/agenda`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
            }

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Error al guardar el ítem.");
            }

            await fetchAgenda();
            setModalOpen(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleCompleted = async (item: AgendaItem) => {
        const token = getToken();
        if (!token) return;
        
        // Optimistic update
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, is_completed: !p.is_completed } : p));

        try {
            const res = await fetch(`${API}/agenda/${item.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ is_completed: !item.is_completed })
            });
            if (!res.ok) throw new Error();
        } catch {
            // Revert on error
            setItems(prev => prev.map(p => p.id === item.id ? { ...p, is_completed: item.is_completed } : p));
            setError("Error al actualizar estado del ítem.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar esta anotación?")) return;
        const token = getToken();
        if (!token) return;

        // Optimistic delete
        const originalItems = [...items];
        setItems(prev => prev.filter(p => p.id !== id));

        try {
            const res = await fetch(`${API}/agenda/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error();
        } catch {
            setItems(originalItems);
            setError("Error al eliminar el ítem.");
        }
    };

    // Derived values for summary boxes
    const pendingTasks = items.filter(i => !i.is_completed).length;
    
    const todayStr = new Date().toISOString().split("T")[0];
    const meetingsToday = items.filter(i => i.category === "reunion" && i.date === todayStr && !i.is_completed).length;
    
    // Exams in current week (next 7 days starting today)
    const getDaysBetween = (d1: string, d2: string) => {
        const diffTime = Math.abs(new Date(d2).getTime() - new Date(d1).getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };
    const examsThisWeek = items.filter(i => {
        if (i.category !== "examen" || i.is_completed) return false;
        try {
            const days = getDaysBetween(todayStr, i.date);
            return days <= 7;
        } catch {
            return false;
        }
    }).length;

    // Filter items list
    const filteredItems = items.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                              (item.content && item.content.toLowerCase().includes(search.toLowerCase()));
        const matchesCat    = catFilter === "all" || item.category === catFilter;
        const matchesPrio   = prioFilter === "all" || item.priority === prioFilter;
        const matchesStatus = statusFilter === "all" || 
                              (statusFilter === "completed" && item.is_completed) || 
                              (statusFilter === "pending" && !item.is_completed);

        return matchesSearch && matchesCat && matchesPrio && matchesStatus;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 bg-notebook-grid p-6 md:p-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                        Portal Docente
                    </span>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2">Mi Agenda</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Organiza tus tareas, reuniones, exámenes y recordatorios escolares.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all self-start md:self-auto text-sm"
                >
                    <Plus className="w-4 h-4" /> Nueva Anotación
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2.5 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                        <ListChecks className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tareas Pendientes</p>
                        <h3 className="text-2xl font-black text-slate-800 mt-0.5">{pendingTasks}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center border border-purple-100">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reuniones Hoy</p>
                        <h3 className="text-2xl font-black text-slate-800 mt-0.5">{meetingsToday}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exámenes Próximos</p>
                        <h3 className="text-2xl font-black text-slate-800 mt-0.5">{examsThisWeek}</h3>
                    </div>
                </div>
            </div>

            {/* Filter and Content section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                
                {/* Sidebar Filters */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-6">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <h4 className="font-bold text-slate-800 text-sm">Filtros de Búsqueda</h4>
                    </div>

                    {/* Search */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buscar por texto</label>
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Escribe para buscar..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoría</label>
                        <select
                            value={catFilter}
                            onChange={(e) => setCatFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1"
                        >
                            <option value="all">Todas las categorías</option>
                            <option value="tarea">Tareas</option>
                            <option value="examen">Exámenes</option>
                            <option value="reunion">Reuniones</option>
                            <option value="recordatorio">Recordatorios</option>
                            <option value="otro">Otros</option>
                        </select>
                    </div>

                    {/* Priority */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridad</label>
                        <select
                            value={prioFilter}
                            onChange={(e) => setPrioFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1"
                        >
                            <option value="all">Todas las prioridades</option>
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                        </select>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="pending">Pendientes</option>
                            <option value="completed">Completados</option>
                        </select>
                    </div>
                </div>

                {/* Agenda List */}
                <div className="lg:col-span-3 space-y-4">
                    {filteredItems.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                <ClipboardList className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-slate-800 text-base">No se encontraron anotaciones</h3>
                            <p className="text-slate-400 text-xs mt-1 max-w-sm">
                                {items.length === 0 
                                    ? "Comienza agregando una nueva anotación utilizando el botón superior."
                                    : "Prueba ajustando los filtros de búsqueda para ver más resultados."
                                }
                            </p>
                        </div>
                    ) : (
                        filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row items-start justify-between gap-4 transition-all hover:border-slate-200/80 ${
                                    item.is_completed ? "opacity-70" : ""
                                }`}
                            >
                                <div className="flex items-start gap-4 w-full">
                                    {/* Completed checkbox */}
                                    <button
                                        onClick={() => handleToggleCompleted(item)}
                                        className="text-slate-400 hover:text-blue-600 transition-colors mt-1 flex-shrink-0"
                                    >
                                        {item.is_completed ? (
                                            <CheckSquare className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>

                                    {/* Main info */}
                                    <div className="space-y-2 w-full">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Title */}
                                            <h4 className={`font-bold text-slate-800 text-sm leading-tight ${
                                                item.is_completed ? "line-through text-slate-400" : ""
                                            }`}>
                                                {item.title}
                                            </h4>
                                            
                                            {/* Category pill */}
                                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg border uppercase tracking-wider ${
                                                CATEGORY_STYLES[item.category]
                                            }`}>
                                                {CATEGORY_LABELS[item.category]}
                                            </span>

                                            {/* Priority pill */}
                                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg border uppercase tracking-wider ${
                                                PRIORITY_STYLES[item.priority]
                                            }`}>
                                                {PRIORITY_LABELS[item.priority]}
                                            </span>
                                        </div>

                                        {/* Description */}
                                        {item.content && (
                                            <p className={`text-slate-500 text-xs leading-relaxed max-w-2xl ${
                                                item.is_completed ? "line-through text-slate-400" : ""
                                            }`}>
                                                {item.content}
                                            </p>
                                        )}

                                        {/* Date and Time info */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[10px] text-slate-400 font-medium">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" /> 
                                                {new Date(item.date + "T00:00:00").toLocaleDateString("es-CL", {
                                                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                                                })}
                                            </span>
                                            {item.start_time && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" /> {item.start_time} hrs
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 self-end sm:self-center">
                                    <button
                                        onClick={() => handleOpenEdit(item)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"
                                        title="Editar anotación"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                        title="Eliminar anotación"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        
                        {/* Header */}
                        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-white/90" />
                                <h3 className="font-bold text-base">
                                    {editingItem ? "Editar Anotación" : "Nueva Anotación"}
                                </h3>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-full transition-all text-white/90 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body Form */}
                        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Preparar guía de física"
                                    value={form.title}
                                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                                />
                            </div>

                            {/* Category & Priority Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-1"
                                    >
                                        <option value="tarea">Tarea</option>
                                        <option value="examen">Examen</option>
                                        <option value="reunion">Reunión</option>
                                        <option value="recordatorio">Recordatorio</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridad</label>
                                    <select
                                        value={form.priority}
                                        onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-1"
                                    >
                                        <option value="low">Baja</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                    </select>
                                </div>
                            </div>

                            {/* Date & Time Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.date}
                                        onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-1"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hora (Opcional)</label>
                                    <input
                                        type="time"
                                        value={form.start_time}
                                        onChange={(e) => setForm(f => ({ ...f, start_time: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-1"
                                    />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contenido / Descripción</label>
                                <textarea
                                    rows={4}
                                    placeholder="Detalles sobre el examen, temario, sala, o notas complementarias..."
                                    value={form.content}
                                    onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-50">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-sm transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all disabled:opacity-50 text-sm"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {saving ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
