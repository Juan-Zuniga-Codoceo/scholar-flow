"use client";

import { useState, useRef } from "react";

interface LicenseUploaderProps {
    onExtractionComplete: (data: any) => void;
}

export default function LicenseUploader({ onExtractionComplete }: LicenseUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };

    const processFile = async (file: File) => {
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
            setError("Formato no soportado. Por favor sube PDF o Imágenes.");
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            // Assuming API is running on localhost:8000
            const response = await fetch("http://localhost:8000/extract-license", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Error procesando el archivo.");
            }

            const data = await response.json();
            onExtractionComplete(data);
        } catch (err) {
            setError("Error al conectar con el motor de IA. Asegúrate que la API esté corriendo.");
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
          relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
          ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-white"}
          ${isUploading ? "opacity-50 pointer-events-none" : ""}
        `}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                />

                <div className="flex flex-col items-center gap-4">
                    <div className="text-4xl">📄</div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {isUploading ? "Procesando con IA..." : "Sube tu Licencia Médica"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Arrastra y suelta tu archivo aquí (PDF o Imagen)
                        </p>
                    </div>

                    {isUploading && (
                        <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
                            <div className="h-full bg-blue-600 animate-pulse w-full"></div>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}
        </div>
    );
}
