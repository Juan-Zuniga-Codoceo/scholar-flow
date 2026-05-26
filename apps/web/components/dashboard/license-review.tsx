"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface LicenseReviewProps {
    initialData: any;
    onConfirm: (data: any) => void;
    onCancel: () => void;
}

export default function LicenseReview({ initialData, onConfirm, onCancel }: LicenseReviewProps) {
    const [formData, setFormData] = useState(initialData);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const [isSaving, setIsSaving] = useState(false);
    const [matches, setMatches] = useState<any[]>([]);
    const [savedId, setSavedId] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            // Persist to Backend/Supabase via API
            const response = await fetch(`${API_URL}/licenses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Error al guardar");
            }

            const result = await response.json();

            // Success: Update state
            setSavedId(result.id);
            if (result.matches && result.matches.length > 0) {
                setMatches(result.matches);
            } else {
                alert("Licencia guardada, pero no se encontraron reemplazos automáticos en la nómina.");
                onConfirm(result); // Close if no matches
            }

        } catch (error) {
            console.error("Error saving license:", error);
            alert("Error al guardar la licencia: " + error);
            setIsSaving(false);
        }
    };

    const handleAssign = async (professorId: string) => {
        if (!savedId) return;

        try {
            const res = await fetch(`${API_URL}/licenses/${savedId}/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ professor_id: professorId })
            });

            if (!res.ok) throw new Error("Error asignando reemplazo");

            alert("✅ Reemplazo asignado y notificado al docente.");
            onConfirm(formData); // Close modal/view

        } catch (error) {
            console.error(error);
            alert("Error asignando reemplazo");
        }
    };

    if (savedId && matches.length > 0) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <span className="text-4xl">✅</span>
                    <h2 className="mt-2 text-xl font-bold text-green-800">Licencia Guardada Exitosamente</h2>
                    <p className="text-green-600">Hemos encontrado {matches.length} posible(s) reemplazo(s).</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-lg mb-4 text-gray-800">Sugerencias de Reemplazo</h3>
                    <div className="space-y-3">
                        {matches.map((m) => (
                            <div key={m.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                                <div>
                                    <p className="font-medium text-gray-900">{m.full_name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(m.subjects || []).join(", ")} • {m.contract_hours} hrs ({m.contract_type}) • <span className="font-semibold text-green-600">{m.available_hours} hrs libres</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleAssign(m.id)}
                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Asignar
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={() => onConfirm(formData)}
                            className="text-gray-500 text-sm hover:underline"
                        >
                            Saltar asignación por ahora
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Revisar Datos Extraídos</h2>
                <p className="text-gray-500">Confirma que la información leída por la IA sea correcta.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Nombre Profesor */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nombre Profesor</label>
                        <input
                            type="text"
                            name="nombre_profesor"
                            value={formData.nombre_profesor || ""}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            disabled={isSaving}
                        />
                    </div>

                    {/* RUT Professor */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">RUT Profesor</label>
                        <input
                            type="text"
                            name="rut_profesor"
                            value={formData.rut_profesor || ""}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            disabled={isSaving}
                        />
                    </div>

                    {/* Emitido Por */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Emitido Por</label>
                        <input
                            type="text"
                            name="emitido_por"
                            value={formData.emitido_por || ""}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            disabled={isSaving}
                        />
                    </div>

                    {/* Fechas */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Fecha Inicio</label>
                        <input
                            type="date"
                            name="fecha_inicio"
                            value={formData.fecha_inicio || ""}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            disabled={isSaving}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Fecha Fin</label>
                        <input
                            type="date"
                            name="fecha_fin"
                            value={formData.fecha_fin || ""}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            disabled={isSaving}
                        />
                    </div>

                    {/* Dias Reposo */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Días de Reposo</label>
                        <input
                            type="number"
                            name="dias_reposo"
                            value={formData.dias_reposo || 0}
                            onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            disabled={isSaving}
                        />
                    </div>

                    {/* Diagnostico (Optional) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Código Diagnóstico (Opcional)</label>
                        <input
                            type="text"
                            name="diagnostico_codigo"
                            value={formData.diagnostico_codigo || ""}
                            onChange={handleChange}
                            placeholder="J00"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
                            disabled={isSaving}
                        />
                    </div>

                </div>

                <div className="pt-6 flex gap-3 justify-end border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <span className="animate-spin">⏳</span> Guardando...
                            </>
                        ) : (
                            "Confirmar y Buscar Reemplazo"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
