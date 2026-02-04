"use client";

import { useState } from "react";

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(formData);
    };

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
                        />
                    </div>

                </div>

                <div className="pt-6 flex gap-3 justify-end border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm"
                    >
                        Confirmar y Buscar Reemplazo
                    </button>
                </div>
            </form>
        </div>
    );
}
