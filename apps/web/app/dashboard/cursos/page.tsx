"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, Trash2, Edit2, BookOpen, User, Clock, AlertCircle, Sparkles, FolderPlus, Eye, FileText, FileSpreadsheet, FileBadge, Upload, X, Download } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Course {
    id: string;
    name: string;
}

interface Professor {
    id: string;
    full_name: string;
}

interface CourseSubject {
    id: string;
    course_id: string;
    subject_name: string;
    weekly_hours: number;
    professor_id: string | null;
    professor_name?: string | null;
}

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [subjects, setSubjects] = useState<CourseSubject[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modals & inputs
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [newCourseName, setNewCourseName] = useState("");

    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<CourseSubject | null>(null);
    const [subjectName, setSubjectName] = useState("");
    const [weeklyHours, setWeeklyHours] = useState(4);
    const [assignedProfId, setAssignedProfId] = useState("");

    // Subject file manager state
    interface SubjectFile { id: string; name: string; type: string; size: string; date: string; category: string; }
    const [viewingSubject, setViewingSubject] = useState<CourseSubject | null>(null);
    const [subjectFiles, setSubjectFiles] = useState<Record<string, SubjectFile[]>>({});
    const [isDragging, setIsDragging] = useState(false);
    const [uploadCategory, setUploadCategory] = useState("Lista de Alumnos");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getFileIcon = (name: string) => {
        const ext = name.split(".").pop()?.toLowerCase() || "";
        if (["xlsx", "xls", "csv"].includes(ext)) return FileSpreadsheet;
        if (["pdf"].includes(ext)) return FileBadge;
        return FileText;
    };

    const handleFileDrop = useCallback((files: FileList | null) => {
        if (!files || !viewingSubject) return;
        const newFiles: SubjectFile[] = Array.from(files).map(f => ({
            id: Math.random().toString(36).slice(2),
            name: f.name,
            type: f.type || "application/octet-stream",
            size: f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
            date: new Date().toLocaleDateString("es-CL"),
            category: uploadCategory,
        }));
        setSubjectFiles(prev => ({
            ...prev,
            [viewingSubject.id]: [...(prev[viewingSubject.id] || []), ...newFiles]
        }));
    }, [viewingSubject, uploadCategory]);

    const handleRemoveFile = (subjectId: string, fileId: string) => {
        setSubjectFiles(prev => ({
            ...prev,
            [subjectId]: (prev[subjectId] || []).filter(f => f.id !== fileId)
        }));
    };

    const fetchData = async () => {
        try {
            setLoadingCourses(true);
            setError(null);
            
            // 1. Fetch courses
            const coursesRes = await fetch(`${API_URL}/courses`);
            if (!coursesRes.ok) throw new Error("Error al cargar cursos");
            const coursesData = await coursesRes.json();
            setCourses(coursesData);
            
            if (coursesData.length > 0 && !selectedCourse) {
                setSelectedCourse(coursesData[0]);
            }

            // 2. Fetch professors for assignments dropdown
            const profsRes = await fetch(`${API_URL}/professors`);
            if (profsRes.ok) {
                const profsData = await profsRes.json();
                setProfessors(profsData);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoadingCourses(false);
        }
    };

    const fetchSubjects = async (courseId: string) => {
        try {
            setLoadingSubjects(true);
            const res = await fetch(`${API_URL}/course-subjects?course_id=${courseId}`);
            if (!res.ok) throw new Error("Error al cargar asignaturas del curso");
            const data = await res.json();
            setSubjects(data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoadingSubjects(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            fetchSubjects(selectedCourse.id);
        } else {
            setSubjects([]);
        }
    }, [selectedCourse]);

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCourseName.trim()) return;
        try {
            const res = await fetch(`${API_URL}/courses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCourseName }),
            });
            if (!res.ok) throw new Error("Error al crear curso");
            const created = await res.json();
            setNewCourseName("");
            setIsCourseModalOpen(false);
            
            // Refresh and select new
            const coursesRes = await fetch(`${API_URL}/courses`);
            if (coursesRes.ok) {
                const data = await coursesRes.json();
                setCourses(data);
                const found = data.find((c: Course) => c.name === created.name);
                if (found) setSelectedCourse(found);
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (!confirm("¿Seguro que deseas eliminar este curso y todos sus ramos asignados?")) return;
        try {
            const res = await fetch(`${API_URL}/courses/${courseId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Error al eliminar curso");
            setSelectedCourse(null);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleSaveSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;

        const payload = {
            course_id: selectedCourse.id,
            subject_name: subjectName,
            weekly_hours: Number(weeklyHours),
            professor_id: assignedProfId || null,
        };

        try {
            let res;
            if (editingSubject) {
                res = await fetch(`${API_URL}/course-subjects/${editingSubject.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch(`${API_URL}/course-subjects`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Error al guardar asignatura");
            }

            setIsSubjectModalOpen(false);
            fetchSubjects(selectedCourse.id);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openCreateSubjectModal = () => {
        setEditingSubject(null);
        setSubjectName("");
        setWeeklyHours(4);
        setAssignedProfId("");
        setIsSubjectModalOpen(true);
    };

    const openEditSubjectModal = (sub: CourseSubject) => {
        setEditingSubject(sub);
        setSubjectName(sub.subject_name);
        setWeeklyHours(sub.weekly_hours);
        setAssignedProfId(sub.professor_id || "");
        setIsSubjectModalOpen(true);
    };

    const handleDeleteSubject = async (id: string) => {
        if (!confirm("¿Eliminar este ramo del curso?")) return;
        try {
            const res = await fetch(`${API_URL}/course-subjects/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Error al eliminar ramo");
            if (selectedCourse) fetchSubjects(selectedCourse.id);
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 bg-notebook-grid p-6 md:p-8 font-sans">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    Cursos y Asignaturas <Sparkles className="w-6 h-6 text-blue-500" />
                </h1>
                <p className="text-slate-500 mt-1 text-sm">
                    Modela la malla curricular, definiendo las asignaturas por curso y sus docentes responsables.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 mb-6">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Left Column: Master Course List */}
                <div className="md:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col h-[calc(100vh-220px)]">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-500" /> Cursos ({courses.length})
                        </h3>
                        <button
                            onClick={() => setIsCourseModalOpen(true)}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                            title="Crear Curso"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {loadingCourses ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 italic">
                            No hay cursos registrados.
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                            {courses.map((course) => {
                                const isSelected = selectedCourse?.id === course.id;
                                return (
                                    <div
                                        key={course.id}
                                        onClick={() => setSelectedCourse(course)}
                                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left cursor-pointer transition-all duration-200 ${
                                            isSelected
                                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/15"
                                                : "text-slate-700 hover:bg-slate-50 border border-transparent"
                                        }`}
                                    >
                                        <span className="font-semibold text-sm">{course.name}</span>
                                        {isSelected && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteCourse(course.id);
                                                }}
                                                className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
                                                title="Eliminar Curso"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2. Right Column: Course Subjects Detail */}
                <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[calc(100vh-220px)]">
                    {selectedCourse ? (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{selectedCourse.name}</h2>
                                    <p className="text-slate-400 text-xs mt-0.5">Asignaturas inscritas en la malla curricular</p>
                                </div>
                                <button
                                    onClick={openCreateSubjectModal}
                                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    Añadir Ramo
                                </button>
                            </div>

                            {loadingSubjects ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : subjects.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                    <BookOpen className="w-12 h-12 text-slate-200 mb-2" />
                                    <p className="text-slate-400 text-sm font-medium">Este curso no tiene ramos aún.</p>
                                    <button
                                        onClick={openCreateSubjectModal}
                                        className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline"
                                    >
                                        Registra el primer ramo ahora
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                    {subjects.map((sub) => {
                                        const fileCount = (subjectFiles[sub.id] || []).length;
                                        return (
                                            <div
                                                key={sub.id}
                                                className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl hover:border-blue-200/50 hover:bg-slate-50 transition-all duration-200"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="space-y-1 flex-1 min-w-0">
                                                        <h4 className="font-semibold text-slate-800 text-sm truncate">{sub.subject_name}</h4>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                            <span className="flex items-center gap-1.5">
                                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                                {sub.weekly_hours} horas semanales
                                                            </span>
                                                            <span className="flex items-center gap-1.5">
                                                                <User className="w-3.5 h-3.5 text-slate-400" />
                                                                {sub.professor_name ? (
                                                                    <span className="text-slate-700 font-medium">{sub.professor_name}</span>
                                                                ) : (
                                                                    <span className="text-amber-500 font-medium italic">Sin docente asignado</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <button
                                                            onClick={() => setViewingSubject(sub)}
                                                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-100 transition-all"
                                                            title="Ver Ficha y Archivos"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            Ficha{fileCount > 0 && <span className="ml-1 bg-violet-600 text-white px-1.5 py-0.5 rounded-full text-[9px]">{fileCount}</span>}
                                                        </button>
                                                        <button
                                                            onClick={() => openEditSubjectModal(sub)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all"
                                                            title="Editar Ramo"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSubject(sub.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-100 transition-all"
                                                            title="Eliminar Ramo"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-800">Selecciona un Curso</h3>
                            <p className="text-slate-400 text-sm mt-1 max-w-xs">
                                Selecciona un curso de la izquierda para ver y gestionar sus asignaturas.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Crear Curso */}
            {isCourseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <FolderPlus className="w-4 h-4 text-blue-500" /> Crear Nuevo Curso
                            </h3>
                            <button
                                onClick={() => setIsCourseModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCourse} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Nombre del Curso
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: 1° Medio A"
                                    value={newCourseName}
                                    onChange={(e) => setNewCourseName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCourseModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/10 transition-colors"
                                >
                                    Crear Curso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Crear / Editar Asignatura */}
            {isSubjectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 text-sm">
                                {editingSubject ? "Editar Asignatura" : "Registrar Asignatura"}
                            </h3>
                            <button
                                onClick={() => setIsSubjectModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveSubject} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Nombre de la Asignatura
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Matemáticas"
                                    value={subjectName}
                                    onChange={(e) => setSubjectName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Horas de Clases Semanales
                                </label>
                                <input
                                    type="number"
                                    required
                                    min={1}
                                    max={20}
                                    value={weeklyHours}
                                    onChange={(e) => setWeeklyHours(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Docente Responsable
                                </label>
                                <select
                                    value={assignedProfId}
                                    onChange={(e) => setAssignedProfId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                >
                                    <option value="">-- Sin docente asignado --</option>
                                    {professors.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsSubjectModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/10 transition-colors"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Ficha de Asignatura + Gestor de Archivos */}
            {viewingSubject && (() => {
                const files = subjectFiles[viewingSubject.id] || [];
                const categories = ["Lista de Alumnos", "Registro de Notas", "Planificación Curricular", "Otro"];
                const categoryColors: Record<string, string> = {
                    "Lista de Alumnos": "bg-blue-50 text-blue-700 border-blue-100",
                    "Registro de Notas": "bg-emerald-50 text-emerald-700 border-emerald-100",
                    "Planificación Curricular": "bg-violet-50 text-violet-700 border-violet-100",
                    "Otro": "bg-slate-50 text-slate-600 border-slate-100",
                };
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white relative overflow-hidden flex-shrink-0">
                                <div className="absolute inset-0 bg-notebook-grid opacity-10"></div>
                                <div className="relative flex items-start justify-between gap-4">
                                    <div>
                                        <span className="text-xs font-bold text-violet-200 uppercase tracking-wider">Ficha de Asignatura</span>
                                        <h3 className="text-2xl font-black tracking-tight mt-0.5">{viewingSubject.subject_name}</h3>
                                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-violet-100/90">
                                            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {viewingSubject.weekly_hours} hrs/semana</span>
                                            <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {viewingSubject.professor_name || "Sin docente"}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setViewingSubject(null)}
                                        className="flex-shrink-0 text-violet-200 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                {/* Categoría y carga */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría del Documento</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setUploadCategory(cat)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                    uploadCategory === cat
                                                        ? categoryColors[cat] + " ring-2 ring-offset-1 ring-current"
                                                        : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Drag and Drop */}
                                <div
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                                        isDragging
                                            ? "border-violet-400 bg-violet-50"
                                            : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/30"
                                    }`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileDrop(e.dataTransfer.files); }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => handleFileDrop(e.target.files)}
                                    />
                                    <Upload className={`w-10 h-10 mx-auto mb-3 ${ isDragging ? "text-violet-500" : "text-slate-300" }`} />
                                    <p className="text-sm font-bold text-slate-500">
                                        {isDragging ? "¡Suelta para cargar!" : "Arrastra archivos aquí o haz clic para seleccionar"}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Se agregará como: <strong className="text-slate-600">{uploadCategory}</strong>
                                    </p>
                                </div>

                                {/* File List */}
                                {files.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documentos Cargados ({files.length})</p>
                                        {files.map(f => {
                                            const Icon = getFileIcon(f.name);
                                            return (
                                                <div key={f.id} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all group">
                                                    <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm flex-shrink-0">
                                                        <Icon className="w-5 h-5 text-slate-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 truncate">{f.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${categoryColors[f.category] || categoryColors["Otro"]}`}>{f.category}</span>
                                                            <span className="text-[10px] text-slate-400">{f.size} · {f.date}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveFile(viewingSubject.id, f.id)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Eliminar archivo"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {files.length === 0 && (
                                    <div className="text-center py-6 text-slate-400">
                                        <FileBadge className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                                        <p className="text-xs font-medium">No hay documentos cargados para esta asignatura.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

function XCircle({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
    );
}
