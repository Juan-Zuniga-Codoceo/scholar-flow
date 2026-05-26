"use client";

import { useEffect, useState } from "react";
import { 
    Users, 
    BookOpen, 
    Calendar, 
    FileText, 
    AlertTriangle, 
    ArrowRight, 
    GraduationCap, 
    Clock, 
    Sparkles, 
    CheckCircle
} from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Professor {
    id: string;
    full_name: string;
    contract_type: string;
}

interface Course {
    id: string;
    name: string;
}

interface ScheduleSlot {
    id: string;
    course_id: string;
    course_name: string;
    day_of_week: number;
    period_number: number;
    professor_id: string | null;
    professor_name: string | null;
    subject_name: string;
}

interface License {
    id: string;
    professor_name: string;
    dias_reposo: number;
    estado: string;
}

const DAYS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export default function DashboardHome() {
    const [stats, setStats] = useState({
        teachers: 0,
        courses: 0,
        scheduledSlots: 0,
        licenses: 0,
        totalSubjectHours: 0
    });
    const [coursesList, setCoursesList] = useState<{ id: string; name: string; completion: number }[]>([]);
    const [collisions, setCollisions] = useState<{ professor: string; day: number; period: number; courses: string[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 1. Fetch teachers
            const tRes = await fetch(`${API_URL}/professors`);
            const teachers: Professor[] = tRes.ok ? await tRes.json() : [];

            // 2. Fetch courses
            const cRes = await fetch(`${API_URL}/courses`);
            const courses: Course[] = cRes.ok ? await cRes.json() : [];

            // 3. Fetch slots
            const sRes = await fetch(`${API_URL}/schedule-slots`);
            const slots: ScheduleSlot[] = sRes.ok ? await sRes.json() : [];

            // 4. Fetch licenses
            const lRes = await fetch(`${API_URL}/licenses`);
            const licenses: License[] = lRes.ok ? await lRes.json() : [];

            // 5. Fetch all subjects to calculate total required weekly hours
            const subRes = await fetch(`${API_URL}/course-subjects`);
            const subjects = subRes.ok ? await subRes.json() : [];
            const totalHours = subjects.reduce((sum: number, s: any) => sum + (s.weekly_hours || 0), 0);

            // Compute collisions (same professor scheduled in different courses at same day/period)
            const professorSlotsMap: { [key: string]: { courseName: string; day: number; period: number }[] } = {};
            slots.forEach((s) => {
                if (!s.professor_id) return;
                const key = `${s.professor_id}_${s.day_of_week}_${s.period_number}`;
                if (!professorSlotsMap[key]) {
                    professorSlotsMap[key] = [];
                }
                professorSlotsMap[key].push({
                    courseName: s.course_name,
                    day: s.day_of_week,
                    period: s.period_number
                });
            });

            const computedCollisions: any[] = [];
            Object.entries(professorSlotsMap).forEach(([key, list]) => {
                if (list.length > 1) {
                    const profId = key.split("_")[0];
                    const profName = slots.find((s) => s.professor_id === profId)?.professor_name || "Docente";
                    computedCollisions.push({
                        professor: profName,
                        day: list[0].day,
                        period: list[0].period,
                        courses: Array.from(new Set(list.map((l) => l.courseName)))
                    });
                }
            });

            // Compute completion percentage per course
            const coursesCompletion = courses.map((c) => {
                const courseSubjects = subjects.filter((s: any) => s.course_id === c.id);
                const reqHours = courseSubjects.reduce((sum: number, s: any) => sum + (s.weekly_hours || 0), 0);
                const schedHours = slots.filter((s) => s.course_id === c.id).length;
                const completion = reqHours > 0 ? Math.round((schedHours / reqHours) * 100) : 0;
                return {
                    id: c.id,
                    name: c.name,
                    completion: Math.min(100, completion)
                };
            });

            setStats({
                teachers: teachers.length,
                courses: courses.length,
                scheduledSlots: slots.length,
                licenses: licenses.length,
                totalSubjectHours: totalHours
            });
            setCoursesList(coursesCompletion);
            setCollisions(computedCollisions);
        } catch (err: any) {
            setError("Error al cargar las estadísticas del panel.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50/50 bg-notebook-grid flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-semibold text-sm">Cargando Scholar-Flow...</p>
                </div>
            </div>
        );
    }

    const overallCompletion = stats.totalSubjectHours > 0 
        ? Math.round((stats.scheduledSlots / stats.totalSubjectHours) * 100) 
        : 0;

    return (
        <div className="min-h-screen bg-slate-50/50 bg-notebook-grid p-6 md:p-8 font-sans">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full uppercase tracking-wider">
                        Establecimiento Demo
                    </span>
                    <span className="text-slate-400 text-xs font-semibold">Año Escolar 2026</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2.5">
                    Panel de Administración <GraduationCap className="w-8 h-8 text-blue-600" />
                </h1>
                <p className="text-slate-500 mt-1 text-sm">
                    Revisa el estado de la asignación horaria, licencias médicas y alertas de disponibilidad.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 mb-6">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {/* Grid de Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Profesores */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profesores</span>
                        <div className="text-3xl font-black text-slate-900 mt-1">{stats.teachers}</div>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Registrados en el sistema</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                {/* Cursos */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cursos</span>
                        <div className="text-3xl font-black text-slate-900 mt-1">{stats.courses}</div>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Niveles activos</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <BookOpen className="w-6 h-6" />
                    </div>
                </div>

                {/* Carga Horaria */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carga Horaria</span>
                        <div className="text-3xl font-black text-slate-900 mt-1">{overallCompletion}%</div>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                            {stats.scheduledSlots} de {stats.totalSubjectHours} hrs agendadas
                        </p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                {/* Licencias Médicas */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Licencias Médicas</span>
                        <div className="text-3xl font-black text-slate-900 mt-1">{stats.licenses}</div>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Procesadas con IA</p>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                        <FileText className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Accesos Rápidos */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Accesos Rápidos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link href="/dashboard/horarios">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
                            <div className="flex justify-between items-start">
                                <Calendar className="w-8 h-8 text-blue-100" />
                                <ArrowRight className="w-5 h-5 text-blue-200 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                            <h4 className="font-extrabold text-lg mt-6">Planificar Horarios</h4>
                            <p className="text-xs text-blue-100/80 mt-1">Planificación visual manual y optimización avanzada con IA.</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/licencias">
                        <div className="bg-gradient-to-br from-violet-600 to-fuchsia-700 rounded-2xl p-6 text-white shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
                            <div className="flex justify-between items-start">
                                <Sparkles className="w-8 h-8 text-violet-100 animate-pulse" />
                                <ArrowRight className="w-5 h-5 text-violet-200 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                            <h4 className="font-extrabold text-lg mt-6">Procesar Licencias</h4>
                            <p className="text-xs text-violet-100/80 mt-1">Escaneo automático de licencias y propuestas de reemplazo.</p>
                        </div>
                    </Link>

                    <Link href="/dashboard/profesores">
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
                            <div className="flex justify-between items-start">
                                <Users className="w-8 h-8 text-slate-300" />
                                <ArrowRight className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                            <h4 className="font-extrabold text-lg mt-6">Administrar Profesores</h4>
                            <p className="text-xs text-slate-300/80 mt-1">Gestión de contratos, ramos autorizados y disponibilidad horaria.</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Dos Columnas: Alertas de Colisiones y Progreso de Horarios */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Alertas de Colisión */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" /> Conflictos en Horarios
                    </h3>
                    
                    {collisions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-10">
                            <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                            <h4 className="font-bold text-slate-800 text-sm">¡Horario Perfecto!</h4>
                            <p className="text-xs text-slate-400 mt-1">No hay profesores con colisión de bloques en la institución.</p>
                        </div>
                    ) : (
                        <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                            {collisions.map((c, i) => (
                                <div key={i} className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-100 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <div className="font-bold">Colisión de Docente</div>
                                        <div className="mt-1">
                                            El profesor <strong className="font-semibold text-red-950">{c.professor}</strong> está asignado simultáneamente el <strong className="font-semibold">{DAYS[c.day]} en el Bloque {c.period}</strong> en los cursos:
                                        </div>
                                        <div className="mt-1.5 flex gap-1.5 flex-wrap">
                                            {c.courses.map((course, idx) => (
                                                <span key={idx} className="bg-red-200 text-red-950 px-2 py-0.5 rounded font-bold">
                                                    {course}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Progreso por Cursos */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" /> Progreso de Cursos
                    </h3>
                    <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                        {coursesList.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No hay cursos registrados.</p>
                        ) : (
                            coursesList.map((c) => (
                                <div key={c.id} className="text-xs space-y-1.5">
                                    <div className="flex justify-between items-center font-semibold text-slate-700">
                                        <span>{c.name}</span>
                                        <span className={c.completion === 100 ? "text-emerald-600 font-bold" : "text-slate-500"}>
                                            {c.completion}% programado
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-300 ${
                                                c.completion === 100 ? "bg-emerald-500" : "bg-blue-600"
                                            }`}
                                            style={{ width: `${c.completion}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
