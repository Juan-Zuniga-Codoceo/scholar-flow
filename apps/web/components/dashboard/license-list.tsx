"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles, User, BookOpen, Calendar, Check, Loader2, AlertCircle, RefreshCw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface License {
    id: string;
    professor_name: string;
    professor_rut: string;
    days_count: number;
    start_date: string;
    end_date: string;
    status: string;
    health_entity?: string | null;
    diagnosis_code?: string | null;
    extracted_data?: any;
    replacement_name?: string | null;
    file_path?: string | null;
}

interface Candidate {
    id: string;
    full_name: string;
    rut: string;
    subjects: string[];
    contract_hours: number;
    assigned_hours: number;
    available_hours: number;
    contract_type: string;
}

export function LicenseList() {
    const [licenses, setLicenses] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // AI matching states
    const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [candidatesLoading, setCandidatesLoading] = useState(false);
    const [candidatesError, setCandidatesError] = useState<string | null>(null);
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [assignedSuccessId, setAssignedSuccessId] = useState<string | null>(null);

    const fetchLicenses = async () => {
        try {
            const res = await fetch(`${API_URL}/licenses`);
            if (!res.ok) throw new Error("Error al cargar licencias");
            const data = await res.json();
            setLicenses(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLicenses();
        // Poll every 8 seconds to update list
        const interval = setInterval(fetchLicenses, 8000);
        return () => clearInterval(interval);
    }, []);

    // Load matching candidates when a license is clicked
    useEffect(() => {
        if (!selectedLicense) return;
        
        const fetchCandidates = async () => {
            try {
                setCandidatesLoading(true);
                setCandidatesError(null);
                const res = await fetch(`${API_URL}/licenses/${selectedLicense.id}/candidates`);
                if (!res.ok) throw new Error("Error al consultar candidatos sugeridos");
                const data = await res.json();
                setCandidates(data);
            } catch (err: any) {
                setCandidatesError(err.message);
            } finally {
                setCandidatesLoading(false);
            }
        };

        fetchCandidates();
    }, [selectedLicense]);

    const handleAssign = async (professorId: string) => {
        if (!selectedLicense) return;

        try {
            setAssigningId(professorId);
            const res = await fetch(`${API_URL}/licenses/${selectedLicense.id}/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ professor_id: professorId })
            });

            if (!res.ok) throw new Error("Error asignando reemplazo");
            
            // Animation success triggers
            setAssignedSuccessId(professorId);
            await fetchLicenses();

            // Close drawer with delay to allow success state to display nicely
            setTimeout(() => {
                setSelectedLicense(null);
                setCandidates([]);
                setAssignedSuccessId(null);
                setAssigningId(null);
            }, 1800);

        } catch (err: any) {
            alert(err.message || "Error asignando reemplazo");
            setAssigningId(null);
        }
    };

    const closeDrawer = () => {
        if (assigningId) return; // Prevent close during assignment
        setSelectedLicense(null);
        setCandidates([]);
        setCandidatesError(null);
    };

    if (loading && licenses.length === 0) {
        return (
            <div className="flex items-center gap-2 text-sf-muted text-sm font-semibold py-8 justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-sf-teal" />
                Cargando historial de licencias...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Error: {error}
            </div>
        );
    }

    if (licenses.length === 0) {
        return (
            <div className="text-center py-10 border border-dashed border-sf rounded-xl bg-white">
                <p className="text-sf-muted font-bold text-sm">No hay licencias médicas registradas aún.</p>
                <p className="text-xs text-sf-muted mt-1">Sube la primera licencia arriba para iniciar el procesamiento con IA.</p>
            </div>
        );
    }

    return (
        <>
            <div className="card-sf overflow-hidden bg-white animate-sf-fade">
                <div className="px-6 py-5 border-b border-sf bg-sf-bg/50 flex items-center justify-between">
                    <div>
                        <h3 className="font-extrabold text-sf-navy text-lg">Historial de Licencias Médicas</h3>
                        <p className="text-xs text-sf-muted font-medium mt-0.5">Control y asignación de contingencias docentes en tiempo real.</p>
                    </div>
                    <button 
                        onClick={fetchLicenses} 
                        className="p-2 text-sf-muted hover:text-sf-teal transition-colors rounded-lg hover:bg-sf-bg"
                        title="Actualizar listado"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-[11px] text-sf-navy/70 uppercase bg-sf-bg border-b border-sf font-black tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Profesor Licenciado</th>
                                <th className="px-6 py-4">RUT</th>
                                <th className="px-6 py-4">Período / Duración</th>
                                <th className="px-6 py-4">Cod. Diagnóstico</th>
                                <th className="px-6 py-4">Estado / Reemplazo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sf">
                            {licenses.map((lic) => (
                                <tr key={lic.id} className="bg-white hover:bg-sf-bg/25 transition-colors">
                                    <td className="px-6 py-4">
                                        <Link 
                                            href={`/dashboard/profesores?view=${encodeURIComponent(lic.professor_name)}`}
                                            className="font-bold text-sf-navy hover:text-sf-teal hover:underline transition-colors"
                                        >
                                            {lic.professor_name || "Desconocido"}
                                        </Link>
                                        <div className="text-[10px] text-sf-muted mt-0.5 flex flex-col gap-0.5">
                                            <span>{lic.health_entity || "Isapre / Fonasa"}</span>
                                            {lic.file_path && (
                                                <a 
                                                    href={`${API_URL}${lic.file_path}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-sf-teal hover:underline font-bold mt-1 text-[9px] inline-flex items-center gap-1 w-fit"
                                                >
                                                    📄 Ver original
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sf-navy/80 font-medium">
                                        {lic.professor_rut}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-sf-navy">
                                            <Calendar className="w-3.5 h-3.5 text-sf-teal" />
                                            {lic.start_date} <span className="text-sf-muted font-normal">→</span> {lic.end_date}
                                        </div>
                                        <div className="mt-1">
                                            <span className="px-2 py-0.5 bg-sf-blue/10 text-sf-blue text-[10px] font-bold rounded-full">
                                                {lic.days_count} días de reposo
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono bg-sf-bg border border-sf px-2 py-0.5 rounded text-xs font-bold text-sf-navy">
                                            {lic.extracted_data?.diagnosis_code || lic.diagnosis_code || "N/A"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1">
                                                <StatusBadge status={lic.status} />
                                                {lic.status === "covered" && lic.replacement_name && (
                                                    <Link 
                                                        href={`/dashboard/profesores?view=${encodeURIComponent(lic.replacement_name)}`}
                                                        className="text-[10px] font-bold text-sf-navy hover:text-sf-teal hover:underline transition-colors flex items-center gap-1"
                                                    >
                                                        🧑‍🏫 Reemplazo: {lic.replacement_name}
                                                    </Link>
                                                )}
                                            </div>
                                            {lic.status === "pending_replacement" && (
                                                <button
                                                    onClick={() => setSelectedLicense(lic)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-sf-gradient-light hover:opacity-90 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    Buscar Reemplazo
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Slide-Over Drawer: AI Replacement Finder ──────────────────────── */}
            {selectedLicense && (
                <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-sf-navy/40 backdrop-blur-sm transition-opacity" onClick={closeDrawer} />
                    <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                        <div className="w-screen max-w-lg transform transition-transform duration-300 ease-in-out bg-white shadow-2xl flex flex-col border-l border-sf h-full">
                            
                            {/* Drawer Header */}
                            <div className="bg-sf-gradient px-6 py-6 text-white relative">
                                <button 
                                    onClick={closeDrawer}
                                    className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-sf-teal-light animate-sf-pulse" />
                                    <span className="text-[9px] font-bold tracking-widest uppercase bg-white/15 px-2 py-0.5 rounded-full">Recomendador IA</span>
                                </div>
                                <h3 className="text-xl font-black mt-2">Buscar Reemplazo</h3>
                                <p className="text-white/70 text-xs mt-1">Sugerencias inteligentes basadas en especialidad, contrato y disponibilidad horaria.</p>
                            </div>

                            {/* Drawer Body (Scrollable) */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                
                                {/* Section 1: Absent Teacher Details */}
                                <div className="bg-sf-bg border border-sf rounded-2xl p-4 space-y-3">
                                    <h4 className="text-xs font-bold text-sf-navy uppercase tracking-wider flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-sf-teal" />
                                        Docente Ausente
                                    </h4>
                                    <div>
                                        <p className="font-black text-sf-navy text-base">{selectedLicense.professor_name}</p>
                                        <p className="text-xs text-sf-muted font-semibold mt-0.5">RUT: {selectedLicense.professor_rut}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-sf text-xs">
                                        <div>
                                            <span className="text-sf-muted block font-bold">Ausencia</span>
                                            <span className="font-black text-sf-navy">{selectedLicense.days_count} días</span>
                                        </div>
                                        <div>
                                            <span className="text-sf-muted block font-bold">Período</span>
                                            <span className="font-black text-sf-navy">{selectedLicense.start_date} al {selectedLicense.end_date}</span>
                                        </div>
                                        <div>
                                            <span className="text-sf-muted block font-bold">Institución</span>
                                            <span className="font-black text-sf-navy truncate block">{selectedLicense.health_entity || "Fonasa / Isapre"}</span>
                                        </div>
                                        <div>
                                            <span className="text-sf-muted block font-bold">Código Diagnóstico</span>
                                            <span className="font-mono font-black text-sf-navy bg-white border border-sf px-1.5 py-0.5 rounded inline-block mt-0.5">
                                                {selectedLicense.extracted_data?.diagnosis_code || selectedLicense.diagnosis_code || "N/A"}
                                            </span>
                                        </div>
                                        {selectedLicense.file_path && (
                                            <div className="col-span-2 pt-2 border-t border-sf">
                                                <a 
                                                    href={`${API_URL}${selectedLicense.file_path}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-sf-bg border border-sf text-sf-navy text-xs font-bold rounded-xl transition-all"
                                                >
                                                    📄 Ver Documento Original
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Section 2: AI Substitute Candidates */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-black text-sf-navy flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-sf-teal" />
                                        Candidatos Recomendados
                                    </h4>

                                    {candidatesLoading ? (
                                        <div className="space-y-3">
                                            {[1, 2].map((i) => (
                                                <div key={i} className="border border-sf rounded-2xl p-4 space-y-3 animate-pulse bg-white">
                                                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                                                    <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                                                    <div className="h-2 bg-slate-100 rounded w-full"></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : candidatesError ? (
                                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2 font-semibold">
                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                            {candidatesError}
                                        </div>
                                    ) : candidates.length === 0 ? (
                                        <div className="text-center py-10 border border-dashed border-sf rounded-2xl bg-sf-bg/50">
                                            <span className="text-4xl block mb-2">😕</span>
                                            <p className="text-sm font-bold text-sf-navy">Sin candidatos recomendados</p>
                                            <p className="text-xs text-sf-muted mt-1 max-w-xs mx-auto px-4">No se encontraron profesores disponibles con asignaturas coincidentes en esta institución.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {candidates.map((cand) => {
                                                const utilization = cand.contract_hours > 0 ? (cand.assigned_hours / cand.contract_hours) * 100 : 0;
                                                const progressColor = utilization > 80 ? "bg-red-500" : utilization > 50 ? "bg-yellow-500" : "bg-sf-green";

                                                return (
                                                    <div 
                                                        key={cand.id} 
                                                        className="border border-sf hover:border-sf-teal/40 hover:shadow-md transition-all duration-200 rounded-2xl p-4 bg-white space-y-3 relative group"
                                                    >
                                                        {/* Contract type badge */}
                                                        <span className={`absolute top-4 right-4 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                                            cand.contract_type === "reemplazo" 
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                                                : "bg-blue-50 text-blue-700 border border-blue-200"
                                                        }`}>
                                                            {cand.contract_type}
                                                        </span>

                                                        {/* Avatar and name */}
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-sf-gradient-light text-white flex items-center justify-center font-black text-sm uppercase">
                                                                {cand.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                                                            </div>
                                                            <div>
                                                                <h5 className="font-extrabold text-sf-navy text-sm group-hover:text-sf-teal transition-colors">{cand.full_name}</h5>
                                                                <p className="text-[10px] text-sf-muted font-bold mt-0.5">RUT: {cand.rut}</p>
                                                            </div>
                                                        </div>

                                                        {/* Subjects */}
                                                        <div className="flex flex-wrap gap-1">
                                                            {(cand.subjects || []).map((sub: string) => (
                                                                <span key={sub} className="text-[10px] font-bold bg-sf-bg border border-sf text-sf-navy px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                                    <BookOpen className="w-2.5 h-2.5 text-sf-teal" />
                                                                    {sub}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        {/* Hours loading */}
                                                        <div className="space-y-1.5 pt-1">
                                                            <div className="flex justify-between text-[10px] font-extrabold">
                                                                <span className="text-sf-muted">Carga: {cand.assigned_hours}h / {cand.contract_hours}h</span>
                                                                <span className="text-sf-green">{cand.available_hours}h libres</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full ${progressColor}`}
                                                                    style={{ width: `${utilization}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="pt-2">
                                                            {assigningId === cand.id ? (
                                                                <button 
                                                                    disabled
                                                                    className="w-full py-2.5 bg-sf-bg border border-sf text-sf-navy font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed"
                                                                >
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sf-teal" />
                                                                    Notificando y Asignando...
                                                                </button>
                                                            ) : assignedSuccessId === cand.id ? (
                                                                <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 animate-sf-fade">
                                                                    <Check className="w-4 h-4 text-emerald-600" />
                                                                    Reemplazo Confirmado
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleAssign(cand.id)}
                                                                    disabled={!!assigningId}
                                                                    className="w-full py-2.5 bg-sf-gradient-light hover:opacity-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                                                                >
                                                                    Asignar Reemplazo
                                                                </button>
                                                            )}
                                                        </div>

                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Drawer Footer */}
                            <div className="bg-sf-bg px-6 py-4 border-t border-sf flex justify-end">
                                <button
                                    onClick={closeDrawer}
                                    disabled={!!assigningId}
                                    className="px-4 py-2 bg-white border border-sf text-sf-navy hover:bg-sf-bg text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    Cerrar buscador
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: "bg-yellow-50 text-yellow-800 border border-yellow-200",
        pending_replacement: "bg-orange-50 text-orange-800 border border-orange-200",
        covered: "bg-emerald-50 text-emerald-800 border border-emerald-200",
        rejected: "bg-red-50 text-red-800 border border-red-200",
    };

    const labels: Record<string, string> = {
        pending: "Pendiente",
        pending_replacement: "Busca Reemplazo",
        covered: "Cubierta",
        rejected: "Rechazada",
    };

    const style = styles[status] || "bg-slate-50 text-slate-800 border border-slate-200";
    const label = labels[status] || status;

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${style}`}>
            {label}
        </span>
    );
}
