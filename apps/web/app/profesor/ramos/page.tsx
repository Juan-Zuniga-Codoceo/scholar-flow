"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    BookOpen, Loader2, Clock, Upload, X, Trash2,
    FileText, FileSpreadsheet, FileBadge, FolderOpen, AlertCircle
} from "lucide-react";
import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SubjectItem {
    id: string;
    subject_name: string;
    weekly_hours: number;
    course_id: string;
    course_name: string;
}

interface SubjectFile {
    id: string;
    name: string;
    size: string;
    date: string;
    category: string;
}

const CATEGORIES = ["Lista de Alumnos", "Registro de Notas", "Planificación Curricular", "Material de Apoyo", "Otro"];

const CAT_COLORS: Record<string, string> = {
    "Lista de Alumnos":       "bg-blue-50  text-blue-700  border-blue-100",
    "Registro de Notas":      "bg-emerald-50 text-emerald-700 border-emerald-100",
    "Planificación Curricular": "bg-violet-50 text-violet-700 border-violet-100",
    "Material de Apoyo":      "bg-amber-50  text-amber-700  border-amber-100",
    "Otro":                   "bg-slate-50  text-slate-600  border-slate-200",
};

function getFileIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["xlsx", "xls", "csv"].includes(ext)) return FileSpreadsheet;
    if (["pdf"].includes(ext)) return FileBadge;
    return FileText;
}

export default function ProfesorRamosPage() {
    const router = useRouter();
    const [subjects, setSubjects]     = useState<SubjectItem[]>([]);
    const [loading, setLoading]       = useState(true);
    const [error, setError]           = useState<string | null>(null);

    // File manager state (per-subject, stored in memory for Stage 1)
    const [viewingSubject, setViewingSubject] = useState<SubjectItem | null>(null);
    const [subjectFiles, setSubjectFiles]     = useState<Record<string, SubjectFile[]>>({});
    const [isDragging, setIsDragging]         = useState(false);
    const [uploadCategory, setUploadCategory] = useState(CATEGORIES[0]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const token = getToken();
        if (!token) { router.replace("/login"); return; }
        fetch(`${API}/professor/subjects`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setSubjects(data);
                else throw new Error("Error al cargar ramos");
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [router]);

    const handleFileDrop = useCallback((files: FileList | null) => {
        if (!files || !viewingSubject) return;
        const newFiles: SubjectFile[] = Array.from(files).map(f => ({
            id: Math.random().toString(36).slice(2),
            name: f.name,
            size: f.size > 1024 * 1024
                ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.round(f.size / 1024)} KB`,
            date: new Date().toLocaleDateString("es-CL"),
            category: uploadCategory,
        }));
        setSubjectFiles(prev => ({
            ...prev,
            [viewingSubject.id]: [...(prev[viewingSubject.id] || []), ...newFiles]
        }));
    }, [viewingSubject, uploadCategory]);

    const removeFile = (subjectId: string, fileId: string) => {
        setSubjectFiles(prev => ({
            ...prev,
            [subjectId]: (prev[subjectId] || []).filter(f => f.id !== fileId)
        }));
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 bg-notebook-grid p-6 md:p-8 font-sans">
            {/* Header */}
            <div className="mb-8">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">Portal Docente</span>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2.5">
                    Mis Ramos <BookOpen className="w-7 h-7 text-indigo-500" />
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    Gestiona documentos, notas y planificación de tus asignaturas asignadas.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-2.5 p-3.5 mb-6 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            {subjects.length === 0 && !error && (
                <div className="text-center py-20">
                    <BookOpen className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">Sin ramos asignados</h3>
                    <p className="text-slate-400 text-sm mt-1">El administrador aún no te ha asignado ningún ramo.</p>
                </div>
            )}

            {/* Subject grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {subjects.map(sub => {
                    const fileCount = (subjectFiles[sub.id] || []).length;
                    return (
                        <div
                            key={sub.id}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-indigo-100 transition-all duration-200 flex flex-col gap-4"
                        >
                            {/* Subject header */}
                            <div>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
                                        <BookOpen className="w-5 h-5 text-white" />
                                    </div>
                                    {fileCount > 0 && (
                                        <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-full">
                                            {fileCount} doc{fileCount > 1 ? "s" : ""}
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-black text-slate-900 text-sm mt-3">{sub.subject_name}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{sub.course_name}</p>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span className="text-[11px] font-bold text-slate-600">{sub.weekly_hours} hrs/sem</span>
                                </div>
                            </div>

                            {/* Action */}
                            <button
                                onClick={() => { setViewingSubject(sub); setUploadCategory(CATEGORIES[0]); }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-100 text-xs transition-all"
                            >
                                <FolderOpen className="w-4 h-4" />
                                Gestionar Documentos
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ── File Manager Modal ─────────────────────────── */}
            {viewingSubject && (() => {
                const files = subjectFiles[viewingSubject.id] || [];
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white relative overflow-hidden flex-shrink-0">
                                <div className="absolute inset-0 bg-notebook-grid opacity-10" />
                                <div className="relative flex items-start justify-between gap-4">
                                    <div>
                                        <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Documentos del Ramo</span>
                                        <h3 className="text-xl font-black mt-0.5">{viewingSubject.subject_name}</h3>
                                        <p className="text-blue-200/80 text-sm mt-0.5">{viewingSubject.course_name} · {viewingSubject.weekly_hours} hrs/sem</p>
                                    </div>
                                    <button
                                        onClick={() => setViewingSubject(null)}
                                        className="text-blue-200 hover:text-white p-1.5 hover:bg-white/10 rounded-xl transition-colors flex-shrink-0"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                {/* Category selector */}
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoría del Documento</p>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setUploadCategory(cat)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                    uploadCategory === cat
                                                        ? CAT_COLORS[cat] + " ring-2 ring-offset-1 ring-current"
                                                        : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Drop zone */}
                                <div
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                                        isDragging
                                            ? "border-indigo-400 bg-indigo-50"
                                            : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                                    }`}
                                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={e => { e.preventDefault(); setIsDragging(false); handleFileDrop(e.dataTransfer.files); }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={e => handleFileDrop(e.target.files)}
                                    />
                                    <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? "text-indigo-500" : "text-slate-300"}`} />
                                    <p className="text-sm font-bold text-slate-500">
                                        {isDragging ? "¡Suelta para subir!" : "Arrastra archivos o haz clic para seleccionar"}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Categoría: <strong className="text-slate-600">{uploadCategory}</strong>
                                    </p>
                                </div>

                                {/* File list */}
                                {files.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Archivos ({files.length})
                                        </p>
                                        {files.map(f => {
                                            const Icon = getFileIcon(f.name);
                                            return (
                                                <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all group">
                                                    <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm flex-shrink-0">
                                                        <Icon className="w-4 h-4 text-slate-500" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 truncate">{f.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${CAT_COLORS[f.category] || CAT_COLORS["Otro"]}`}>
                                                                {f.category}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400">{f.size} · {f.date}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFile(viewingSubject.id, f.id)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {files.length === 0 && (
                                    <div className="text-center py-4 text-slate-400">
                                        <FileBadge className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                                        <p className="text-xs">No hay documentos cargados para este ramo.</p>
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
