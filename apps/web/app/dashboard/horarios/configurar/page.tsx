"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Settings, Save, CheckCircle, ArrowLeft, Plus, Trash2,
    Coffee, UtensilsCrossed, Clock, Calendar, ToggleLeft, ToggleRight
} from "lucide-react";
import {
    ScheduleConfig, DayConfig, BreakConfig,
    DEFAULT_SCHEDULE_CONFIG,
    loadScheduleConfig, saveScheduleConfig,
    generateTimeline, timeToMinutes
} from "@/lib/scheduleConfig";

// ── Small helpers ──────────────────────────────
const BREAK_COLORS = {
    recreo:   "bg-amber-50  border-amber-200  text-amber-700",
    almuerzo: "bg-emerald-50 border-emerald-200 text-emerald-700",
};

const BREAK_BAR_COLORS = {
    recreo:   "bg-amber-400",
    almuerzo: "bg-emerald-500",
};

const PERIOD_COLORS = [
    "bg-blue-500","bg-indigo-500","bg-violet-500","bg-purple-500",
    "bg-sky-500","bg-cyan-500","bg-teal-500","bg-blue-600",
    "bg-indigo-600","bg-violet-600","bg-purple-600","bg-sky-600",
];

export default function ConfigurarJornadaPage() {
    const [cfg, setCfg]     = useState<ScheduleConfig>(DEFAULT_SCHEDULE_CONFIG);
    const [saved, setSaved] = useState(false);
    const [previewDay, setPreviewDay] = useState(0); // index in cfg.days
    const [newBreak, setNewBreak] = useState<Omit<BreakConfig, "id">>({
        name: "Recreo", startTime: "10:00", duration: 15, type: "recreo"
    });

    useEffect(() => {
        setCfg(loadScheduleConfig());
    }, []);

    const handleSave = () => {
        saveScheduleConfig(cfg);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    // ── Day mutations ──────────────────────────
    const updateDay = (idx: number, patch: Partial<DayConfig>) =>
        setCfg(c => ({ ...c, days: c.days.map((d, i) => i === idx ? { ...d, ...patch } : d) }));

    // ── Break mutations ────────────────────────
    const addBreak = () => {
        const id = `b_${Date.now()}`;
        setCfg(c => ({ ...c, breaks: [...c.breaks, { id, ...newBreak }] }));
        setNewBreak({ name: "Recreo", startTime: "10:00", duration: 15, type: "recreo" });
    };

    const removeBreak = (id: string) =>
        setCfg(c => ({ ...c, breaks: c.breaks.filter(b => b.id !== id) }));

    const updateBreak = (id: string, patch: Partial<BreakConfig>) =>
        setCfg(c => ({ ...c, breaks: c.breaks.map(b => b.id === id ? { ...b, ...patch } : b) }));

    // ── Live preview ───────────────────────────
    const timeline = generateTimeline(cfg);
    const previewDayConfig = cfg.days[previewDay];

    const previewSlots = timeline.map(slot => {
        const startMin = timeToMinutes(slot.start);
        const endMin   = timeToMinutes(slot.end);
        const dayStart = timeToMinutes(previewDayConfig.start);
        const dayEnd   = timeToMinutes(previewDayConfig.end);
        const afterHours = startMin >= dayEnd || !previewDayConfig.active;
        return { slot, afterHours };
    });

    const activePeriods = previewSlots.filter(s => !s.afterHours && s.slot.type === "period");

    return (
        <div className="min-h-screen bg-slate-50/50 bg-notebook-grid p-6 md:p-8 font-sans">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/dashboard/horarios"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 mb-4 transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver al Planificador
                </Link>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full uppercase tracking-wider">Configuración</span>
                    <span className="text-slate-400 text-xs font-semibold">Jornada Escolar</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2.5">
                    Configurar Jornada <Settings className="w-7 h-7 text-blue-600" />
                </h1>
                <p className="text-slate-500 mt-1 text-sm">
                    Define los horarios de entrada y salida por día, los recreos y el almuerzo. Los bloques se generan automáticamente.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* ─── LEFT: Form ─────────────────────────────── */}
                <div className="xl:col-span-2 space-y-6">

                    {/* Block duration */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" /> Duración de los Bloques
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <input
                                    type="range"
                                    min={30} max={90} step={5}
                                    value={cfg.blockDuration}
                                    onChange={e => setCfg(c => ({ ...c, blockDuration: Number(e.target.value) }))}
                                    className="w-full accent-blue-600"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                                    <span>30 min</span><span>60 min</span><span>90 min</span>
                                </div>
                            </div>
                            <div className="w-24 text-center px-4 py-3 bg-blue-50 text-blue-700 font-black text-xl rounded-xl border border-blue-100">
                                {cfg.blockDuration}<span className="text-xs font-semibold ml-0.5">min</span>
                            </div>
                        </div>
                    </div>

                    {/* Days */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-500" /> Horario por Día
                        </h3>
                        <div className="space-y-3">
                            {cfg.days.map((day, idx) => (
                                <div
                                    key={day.id}
                                    className={`p-4 rounded-xl border transition-all ${day.active
                                        ? "border-slate-200 bg-white"
                                        : "border-slate-100 bg-slate-50/50 opacity-60"}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Toggle */}
                                        <button
                                            onClick={() => updateDay(idx, { active: !day.active })}
                                            className="flex-shrink-0"
                                        >
                                            {day.active
                                                ? <ToggleRight className="w-7 h-7 text-blue-600" />
                                                : <ToggleLeft  className="w-7 h-7 text-slate-300" />}
                                        </button>

                                        {/* Day name */}
                                        <span className="w-24 font-bold text-slate-800 text-sm">{day.name}</span>

                                        {/* Start / End */}
                                        <div className="flex items-center gap-2 flex-1">
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entrada</label>
                                                <input
                                                    type="time"
                                                    value={day.start}
                                                    disabled={!day.active}
                                                    onChange={e => updateDay(idx, { start: e.target.value })}
                                                    className="block px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                            <span className="text-slate-300 mt-4 font-bold">→</span>
                                            <div className="space-y-0.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salida</label>
                                                <input
                                                    type="time"
                                                    value={day.end}
                                                    disabled={!day.active}
                                                    onChange={e => updateDay(idx, { end: e.target.value })}
                                                    className="block px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Preview button */}
                                        <button
                                            onClick={() => setPreviewDay(idx)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                                previewDay === idx
                                                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                                                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            {previewDay === idx ? "Previsualizando" : "Previsualizar"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Breaks */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Coffee className="w-5 h-5 text-amber-500" /> Pausas (Recreos y Almuerzo)
                        </h3>
                        <p className="text-xs text-slate-400 mb-4">Las pausas aplican a todos los días activos. Si la pausa cae después de la hora de salida de un día, se ignora automáticamente.</p>

                        {/* Existing breaks */}
                        <div className="space-y-3 mb-5">
                            {cfg.breaks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)).map(brk => (
                                <div key={brk.id} className={`flex items-center gap-3 p-3.5 rounded-xl border ${BREAK_COLORS[brk.type]}`}>
                                    {brk.type === "almuerzo"
                                        ? <UtensilsCrossed className="w-4 h-4 flex-shrink-0" />
                                        : <Coffee className="w-4 h-4 flex-shrink-0" />}

                                    <input
                                        type="text"
                                        value={brk.name}
                                        onChange={e => updateBreak(brk.id, { name: e.target.value })}
                                        className="flex-1 bg-transparent text-xs font-bold focus:outline-none border-b border-current/20 pb-0.5"
                                    />

                                    <input
                                        type="time"
                                        value={brk.startTime}
                                        onChange={e => updateBreak(brk.id, { startTime: e.target.value })}
                                        className="bg-white/60 border border-current/20 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                                    />

                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            min={5} max={120} step={5}
                                            value={brk.duration}
                                            onChange={e => updateBreak(brk.id, { duration: Number(e.target.value) })}
                                            className="w-14 bg-white/60 border border-current/20 rounded-lg px-2 py-1 text-xs font-semibold text-center focus:outline-none"
                                        />
                                        <span className="text-[10px] font-bold opacity-60">min</span>
                                    </div>

                                    <select
                                        value={brk.type}
                                        onChange={e => updateBreak(brk.id, { type: e.target.value as any })}
                                        className="bg-white/60 border border-current/20 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                                    >
                                        <option value="recreo">Recreo</option>
                                        <option value="almuerzo">Almuerzo</option>
                                    </select>

                                    <button
                                        onClick={() => removeBreak(brk.id)}
                                        className="p-1 hover:opacity-70 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add new break */}
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Agregar Pausa</p>
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre</label>
                                    <input
                                        type="text"
                                        value={newBreak.name}
                                        onChange={e => setNewBreak(n => ({ ...n, name: e.target.value }))}
                                        className="block px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-32"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hora inicio</label>
                                    <input
                                        type="time"
                                        value={newBreak.startTime}
                                        onChange={e => setNewBreak(n => ({ ...n, startTime: e.target.value }))}
                                        className="block px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duración</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            min={5} max={120} step={5}
                                            value={newBreak.duration}
                                            onChange={e => setNewBreak(n => ({ ...n, duration: Number(e.target.value) }))}
                                            className="block px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-20"
                                        />
                                        <span className="text-xs text-slate-400 font-semibold">min</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
                                    <select
                                        value={newBreak.type}
                                        onChange={e => setNewBreak(n => ({ ...n, type: e.target.value as any }))}
                                        className="block px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    >
                                        <option value="recreo">Recreo</option>
                                        <option value="almuerzo">Almuerzo</option>
                                    </select>
                                </div>
                                <button
                                    onClick={addBreak}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-500/10 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Agregar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Save */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <Save className="w-5 h-5" />
                            Guardar Jornada
                        </button>
                        {saved && (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-semibold animate-in fade-in duration-200">
                                <CheckCircle className="w-4 h-4" />
                                Configuración guardada
                            </div>
                        )}
                        <Link
                            href="/dashboard/horarios"
                            className="px-5 py-3 border border-slate-200 text-slate-500 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                        >
                            Ir al Planificador
                        </Link>
                    </div>
                </div>

                {/* ─── RIGHT: Live Preview ─────────────────────── */}
                <div className="xl:col-span-1">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" /> Vista Previa
                            </h3>
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                                {previewDayConfig.name}
                            </span>
                        </div>

                        {!previewDayConfig.active ? (
                            <div className="text-center py-10 text-slate-400">
                                <ToggleLeft className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                                <p className="text-xs font-semibold">Este día está desactivado.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <span>{previewDayConfig.start}</span>
                                    <span className="text-blue-600">{activePeriods.length} bloques</span>
                                    <span>{previewDayConfig.end}</span>
                                </div>

                                <div className="space-y-1.5">
                                    {previewSlots.map(({ slot, afterHours }, i) => {
                                        if (slot.type === "break") {
                                            if (afterHours) return null;
                                            return (
                                                <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-bold ${BREAK_COLORS[slot.breakType]}`}>
                                                    <div className={`w-1.5 h-full min-h-[14px] rounded-full ${BREAK_BAR_COLORS[slot.breakType]}`}></div>
                                                    <span>{slot.name}</span>
                                                    <span className="ml-auto opacity-60">{slot.start} – {slot.end}</span>
                                                    <span className="opacity-60 font-mono">{timeToMinutes(slot.end) - timeToMinutes(slot.start)}m</span>
                                                </div>
                                            );
                                        }

                                        const period = slot;
                                        const colorIdx = (period.num - 1) % PERIOD_COLORS.length;
                                        return (
                                            <div
                                                key={i}
                                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-white ${
                                                    afterHours
                                                        ? "bg-slate-100 text-slate-300 border border-slate-100"
                                                        : PERIOD_COLORS[colorIdx]
                                                }`}
                                            >
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${afterHours ? "bg-slate-200 text-slate-400" : "bg-white/20"}`}>
                                                    {period.num}
                                                </span>
                                                <span>{afterHours ? "Sin clases" : `Bloque ${period.num}`}</span>
                                                <span className="ml-auto font-mono text-[10px] opacity-80">{period.start} – {period.end}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
