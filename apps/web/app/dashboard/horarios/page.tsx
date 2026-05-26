"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
    Calendar, 
    BookOpen, 
    Sparkles, 
    AlertTriangle, 
    Trash2, 
    Clock, 
    User,
    CheckCircle,
    HelpCircle,
    Plus,
    Settings,
    FileSpreadsheet,
    FileDown
} from "lucide-react";
import {
    loadScheduleConfig, generateTimeline,
    slotStatusForDay, timeToMinutes,
    type ScheduleConfig, type TimeSlot
} from "@/lib/scheduleConfig";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Course {
    id: string;
    name: string;
}

interface CourseSubject {
    id: string;
    course_id: string;
    subject_name: string;
    weekly_hours: number;
    professor_id: string | null;
    professor_name?: string | null;
}

interface ScheduleSlot {
    id: string;
    course_id: string;
    course_subject_id: string;
    day_of_week: number;
    period_number: number;
    course_name: string;
    subject_name: string;
    weekly_hours: number;
    professor_id: string | null;
    professor_name: string | null;
}

export default function HorariosPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [subjects, setSubjects] = useState<CourseSubject[]>([]);
    const [courseSlots, setCourseSlots] = useState<ScheduleSlot[]>([]);
    const [allSlots, setAllSlots] = useState<ScheduleSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [optimizing, setOptimizing] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    // Active cell click state
    const [activeCell, setActiveCell] = useState<{ day: number; period: number } | null>(null);

    // Dynamic schedule config
    const [schedCfg, setSchedCfg] = useState<ScheduleConfig | null>(null);
    const timeline: TimeSlot[] = schedCfg ? generateTimeline(schedCfg) : [];
    const activeDays = schedCfg ? schedCfg.days.filter(d => d.active) : [];

    useEffect(() => {
        // Load after mount to avoid SSR/localStorage mismatch
        setSchedCfg(loadScheduleConfig());
        const refresh = () => setSchedCfg(loadScheduleConfig());
        window.addEventListener("scheduleConfigChanged", refresh);
        return () => window.removeEventListener("scheduleConfigChanged", refresh);
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 1. Fetch courses
            const coursesRes = await fetch(`${API_URL}/courses`);
            if (!coursesRes.ok) throw new Error("Error al cargar cursos");
            const coursesData = await coursesRes.json();
            setCourses(coursesData);
            
            if (coursesData.length > 0 && !selectedCourse) {
                setSelectedCourse(coursesData[0]);
            }
            
            // 2. Fetch ALL scheduled slots to check for teacher collisions
            const slotsRes = await fetch(`${API_URL}/schedule-slots`);
            if (slotsRes.ok) {
                const slotsData = await slotsRes.json();
                setAllSlots(slotsData);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourseDetails = async (courseId: string) => {
        try {
            // Fetch subjects
            const subjRes = await fetch(`${API_URL}/course-subjects?course_id=${courseId}`);
            if (subjRes.ok) {
                const subjData = await subjRes.json();
                setSubjects(subjData);
            }

            // Fetch slots for this course
            const slotsRes = await fetch(`${API_URL}/schedule-slots?course_id=${courseId}`);
            if (slotsRes.ok) {
                const slotsData = await slotsRes.json();
                setCourseSlots(slotsData);
            }
        } catch (err) {
            console.error("Error loading course details", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            fetchCourseDetails(selectedCourse.id);
            setActiveCell(null);
        }
    }, [selectedCourse]);

    // Recalculate all slots in background when something changes
    const refreshAllSlots = async () => {
        const slotsRes = await fetch(`${API_URL}/schedule-slots`);
        if (slotsRes.ok) {
            const slotsData = await slotsRes.json();
            setAllSlots(slotsData);
            if (selectedCourse) {
                const currentSlots = slotsData.filter((s: ScheduleSlot) => s.course_id === selectedCourse.id);
                setCourseSlots(currentSlots);
            }
        }
    };

    const handleAssignSlot = async (subjectId: string, day: number, period: number) => {
        if (!selectedCourse) return;
        try {
            const res = await fetch(`${API_URL}/schedule-slots`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_id: selectedCourse.id,
                    course_subject_id: subjectId,
                    day_of_week: day,
                    period_number: period
                })
            });
            if (!res.ok) throw new Error("Error al asignar bloque");
            
            setActiveCell(null);
            await refreshAllSlots();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleRemoveSlot = async (slotId: string) => {
        if (!confirm("¿Deseas desasignar esta clase de este bloque?")) return;
        try {
            const res = await fetch(`${API_URL}/schedule-slots/${slotId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Error al remover bloque");
            await refreshAllSlots();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleAiOptimize = async () => {
        if (!selectedCourse) {
            alert("Por favor selecciona un curso para optimizar.");
            return;
        }
        try {
            setOptimizing(true);
            setError(null);
            const res = await fetch(`${API_URL}/schedule-slots/optimize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ course_id: selectedCourse.id })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Error en la optimización con IA");
            }
            alert("¡Horario optimizado por la IA (Gemini) con éxito!");
            await refreshAllSlots();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setOptimizing(false);
        }
    };

    const handleExportExcel = async () => {
        if (!selectedCourse || !schedCfg) return;
        try {
            setExportingExcel(true);
            const res = await fetch(`${API_URL}/schedule-slots/export/excel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_id: selectedCourse.id,
                    schedule_config: schedCfg
                })
            });
            if (!res.ok) throw new Error("Error al exportar a Excel");
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `horario_${selectedCourse.name.replace(/\s+/g, "_")}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setExportingExcel(false);
        }
    };

    const handleExportPdf = async () => {
        if (!selectedCourse || !schedCfg) return;
        try {
            setExportingPdf(true);
            const res = await fetch(`${API_URL}/schedule-slots/export/pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_id: selectedCourse.id,
                    schedule_config: schedCfg
                })
            });
            if (!res.ok) throw new Error("Error al exportar a PDF");
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `horario_${selectedCourse.name.replace(/\s+/g, "_")}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setExportingPdf(false);
        }
    };

    // Helper: find slot in course schedule
    const getSlotAt = (day: number, period: number) => {
        return courseSlots.find((s) => s.day_of_week === day && s.period_number === period);
    };

    // Helper: check for teacher collisions
    // Returns collision details if the teacher of the selected slot is busy in another course during the same slot
    const getCollision = (slot: ScheduleSlot) => {
        if (!slot.professor_id) return null;
        return allSlots.find(
            (s) => 
                s.course_id !== slot.course_id && 
                s.day_of_week === slot.day_of_week && 
                s.period_number === slot.period_number && 
                s.professor_id === slot.professor_id
        );
    };

    // Helper: calculate scheduled hours vs weekly required hours for each subject
    const getHoursStats = (subj: CourseSubject) => {
        const scheduledCount = courseSlots.filter((s) => s.course_subject_id === subj.id).length;
        return {
            scheduled: scheduledCount,
            total: subj.weekly_hours,
            remaining: subj.weekly_hours - scheduledCount
        };
    };

    return (
        <div className="min-h-screen bg-slate-50/50 bg-notebook-grid p-6 md:p-8 font-sans">
            {/* Header / Topbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        Planificador de Horarios Semanales <Calendar className="w-6 h-6 text-blue-500" />
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Planifica manualmente las asignaturas o delega el trabajo pesado a la IA.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/dashboard/horarios/configurar"
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 shadow-sm"
                    >
                        <Settings className="w-4 h-4" />
                        Configurar Jornada
                    </Link>
                    <button
                        onClick={handleExportExcel}
                        disabled={exportingExcel || !selectedCourse}
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Exportar a CSV compatible con Excel"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        {exportingExcel ? "Exportando..." : "Exportar Excel"}
                    </button>
                    <button
                        onClick={handleExportPdf}
                        disabled={exportingPdf || !selectedCourse}
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Exportar a PDF listo para imprimir"
                    >
                        <FileDown className="w-4 h-4 text-rose-500" />
                        {exportingPdf ? "Exportando..." : "Exportar PDF"}
                    </button>
                    <button
                        onClick={handleAiOptimize}
                        disabled={optimizing}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Sparkles className={`w-5 h-5 text-yellow-300 ${optimizing ? "animate-spin" : "animate-pulse"}`} />
                        {optimizing ? "Optimizando..." : "Optimizar con IA (Gemini)"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 mb-6">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* 1. Left side: Course list & Stats */}
                <div className="xl:col-span-1 space-y-6">
                    {/* Course list card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                        <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2.5 flex items-center gap-2 text-sm">
                            <BookOpen className="w-4.5 h-4.5 text-blue-500" /> Cursos
                        </h3>
                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {courses.map((c) => {
                                const isSelected = selectedCourse?.id === c.id;
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => setSelectedCourse(c)}
                                        className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                            isSelected
                                                ? "bg-blue-600 text-white shadow-sm"
                                                : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        {c.name}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pending distribution stats */}
                    {selectedCourse && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                            <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2.5 flex items-center gap-2 text-sm">
                                <Clock className="w-4.5 h-4.5 text-blue-500" /> Distribución de Ramos
                            </h3>
                            <div className="space-y-3">
                                {subjects.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No hay ramos creados para este curso.</p>
                                ) : (
                                    subjects.map((subj) => {
                                        const { scheduled, total, remaining } = getHoursStats(subj);
                                        const isCompleted = remaining === 0;
                                        const isOverallocated = remaining < 0;

                                        return (
                                            <div key={subj.id} className="text-xs space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-slate-700">{subj.subject_name}</span>
                                                    <span className={`font-mono font-semibold ${
                                                        isCompleted ? "text-emerald-600" : isOverallocated ? "text-red-500" : "text-amber-500"
                                                    }`}>
                                                        {scheduled}/{total} hrs
                                                    </span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                            isOverallocated ? "bg-red-500" : isCompleted ? "bg-emerald-500" : "bg-amber-400"
                                                        }`}
                                                        style={{ width: `${Math.min(100, (scheduled / total) * 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                    <span>Prof: {subj.professor_name || "Sin asignar"}</span>
                                                    {remaining > 0 ? (
                                                        <span>Faltan {remaining} hrs</span>
                                                    ) : isOverallocated ? (
                                                        <span className="text-red-500">Exceso {Math.abs(remaining)} hrs</span>
                                                    ) : (
                                                        <span className="text-emerald-600 font-semibold">Listo</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Right side: Weekly timetable grid */}
                <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col overflow-x-auto">
                    {selectedCourse ? (
                        <>
                            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Horario de {selectedCourse.name}</h2>
                                    <p className="text-xs text-slate-400">Haz clic en cualquier celda para programar asignaturas.</p>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded bg-emerald-500"></div> Asignado
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded bg-red-500 animate-pulse"></div> Conflicto de Docente
                                    </div>
                                </div>
                            </div>

                            {/* Timetable Table Grid */}
                            <table className="w-full border-collapse border border-slate-100 text-left min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="border border-slate-100 p-3 text-xs font-bold text-slate-600 w-28">Bloque</th>
                                        {activeDays.map((day) => (
                                            <th key={day.id} className="border border-slate-100 p-3 text-xs font-bold text-slate-600 text-center">
                                                <div>{day.name}</div>
                                                <div className="text-[9px] font-normal text-slate-400 mt-0.5">{day.start} – {day.end}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timeline.map((tslot, rowIdx) => {
                                        // ── Break row ────────────────────────
                                        if (tslot.type === "break") {
                                            // Only show if at least one active day has this break in range
                                            const visible = activeDays.some(d => slotStatusForDay(tslot, d) === "break");
                                            if (!visible) return null;
                                            return (
                                                <tr key={`break-${tslot.id}`} className={tslot.breakType === "almuerzo" ? "bg-emerald-50/60" : "bg-amber-50/60"}>
                                                    <td className={`border border-slate-100 p-2 text-center ${ tslot.breakType === "almuerzo" ? "text-emerald-700" : "text-amber-700" }`}>
                                                        <div className="text-[10px] font-black uppercase tracking-wider">{tslot.name}</div>
                                                        <div className="text-[9px] opacity-70 mt-0.5">{tslot.start} – {tslot.end}</div>
                                                        <div className="text-[9px] opacity-60">{timeToMinutes(tslot.end) - timeToMinutes(tslot.start)} min</div>
                                                    </td>
                                                    {activeDays.map(day => {
                                                        const status = slotStatusForDay(tslot, day);
                                                        return (
                                                            <td key={day.id} className={`border border-slate-100 p-2 text-center text-[10px] font-semibold ${
                                                                status === "after-hours"
                                                                    ? "bg-slate-50 text-slate-300"
                                                                    : tslot.breakType === "almuerzo"
                                                                        ? "bg-emerald-50/80 text-emerald-600"
                                                                        : "bg-amber-50/80 text-amber-600"
                                                            }`}>
                                                                {status === "after-hours" ? "—" : tslot.name}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        }

                                        // ── Class period row ─────────────────
                                        const period = tslot;
                                        return (
                                        <tr key={`period-${period.num}`} className="hover:bg-slate-50/20">
                                            {/* Period label */}
                                            <td className="border border-slate-100 p-3 align-middle text-center bg-slate-50/30">
                                                <div className="font-black text-slate-800 text-xs">Bloque {period.num}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{period.start} – {period.end}</div>
                                            </td>

                                            {/* Daily grid cells */}
                                            {activeDays.map((day) => {
                                                const dayStatus = slotStatusForDay(period, day);
                                                if (dayStatus === "after-hours" || dayStatus === "inactive-day") {
                                                    return (
                                                        <td key={day.id} className="border border-slate-100 p-2 bg-slate-50/60 text-center">
                                                            <span className="text-[10px] text-slate-300 font-semibold">Sin clases</span>
                                                        </td>
                                                    );
                                                }

                                                const slot = getSlotAt(day.id, period.num);
                                                const collision = slot ? getCollision(slot) : null;
                                                const cellActive = activeCell?.day === day.id && activeCell?.period === period.num;

                                                return (
                                                    <td
                                                        key={day.id}
                                                        className={`border border-slate-100 p-2 align-top text-center relative transition-all min-h-[70px] ${
                                                            slot 
                                                                ? collision 
                                                                    ? "bg-red-50/40 border-red-200" 
                                                                    : "bg-blue-50/30 border-blue-100" 
                                                                : "hover:bg-slate-50/60 cursor-pointer"
                                                        }`}
                                                        onClick={() => {
                                                            if (!slot) {
                                                                setActiveCell(cellActive ? null : { day: day.id, period: period.num });
                                                            }
                                                        }}
                                                    >
                                                        {slot ? (
                                                            <div className="relative group p-1.5 rounded-lg flex flex-col justify-between h-full">
                                                                <div>
                                                                    <div className="font-bold text-xs text-slate-900">{slot.subject_name}</div>
                                                                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                                                                        <User className="w-3 h-3 text-slate-400" />
                                                                        {slot.professor_name || "Sin docente"}
                                                                    </div>
                                                                </div>

                                                                {/* Collision alert */}
                                                                {collision && (
                                                                    <div className="mt-2 p-1 bg-red-100 text-red-700 rounded text-[9px] font-semibold flex items-center justify-center gap-1 border border-red-200 animate-pulse">
                                                                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                                                        <span>Ocupado en {collision.course_name}</span>
                                                                    </div>
                                                                )}

                                                                {/* Remove button */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveSlot(slot.id);
                                                                    }}
                                                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 bg-white hover:bg-slate-50 rounded shadow-sm border border-slate-100 transition-opacity"
                                                                    title="Desasignar"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : cellActive ? (
                                                            /* Quick select dropdown modal overlay inside cell */
                                                            <div className="absolute inset-0 bg-white z-10 p-2 shadow-xl border border-slate-200 rounded-lg flex flex-col justify-between">
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                                                    Asignar Ramo
                                                                </div>
                                                                <div className="flex-1 overflow-y-auto space-y-1">
                                                                    {subjects.map((subj) => (
                                                                        <button
                                                                            key={subj.id}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleAssignSlot(subj.id, day.id, period.num);
                                                                            }}
                                                                            className="w-full text-left px-2 py-1 hover:bg-blue-50 text-slate-700 text-[10px] font-medium rounded truncate"
                                                                        >
                                                                            {subj.subject_name}
                                                                        </button>
                                                                    ))}
                                                                    {subjects.length === 0 && (
                                                                        <span className="text-[9px] text-slate-400 italic">No hay ramos</span>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveCell(null);
                                                                    }}
                                                                    className="mt-1.5 w-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] py-0.5 rounded font-bold"
                                                                >
                                                                    Cerrar
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="text-slate-300 text-xs italic flex flex-col items-center justify-center py-4 select-none">
                                                                <Plus className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                            <Calendar className="w-16 h-16 text-slate-200 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-800 font-sans">Selecciona un Curso</h3>
                            <p className="text-slate-400 text-sm mt-1 max-w-xs">
                                Selecciona un curso del panel lateral izquierdo para ver o planificar su horario escolar.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AlertCircle({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
    );
}
