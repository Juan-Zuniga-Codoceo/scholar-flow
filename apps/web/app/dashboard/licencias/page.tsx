"use client";

import { useState } from "react";
import LicenseUploader from "@/components/dashboard/license-uploader";
import LicenseReview from "@/components/dashboard/license-review";

export default function LicensePage() {
    const [step, setStep] = useState<"upload" | "review">("upload");
    const [licenseData, setLicenseData] = useState<any>(null);

    const handleExtractionComplete = (data: any) => {
        setLicenseData(data);
        setStep("review");
    };

    const handleConfirm = (finalData: any) => {
        console.log("Licencia Confirmada:", finalData);
        alert("¡Licencia Guardada! (Lógica de reemplazo pendiente)");
        // Reset flow
        setStep("upload");
        setLicenseData(null);
    };

    const handleCancel = () => {
        setStep("upload");
        setLicenseData(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <header className="mb-8 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Licencias Médicas</h1>
                <p className="text-gray-500 mt-2">
                    Sube la licencia digital para procesarla automáticamente con nuestro Motor IA y gestionar reemplazos.
                </p>
            </header>

            <main className="max-w-4xl mx-auto">
                {step === "upload" && (
                    <div className="transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
                        <LicenseUploader onExtractionComplete={handleExtractionComplete} />
                    </div>
                )}

                {step === "review" && licenseData && (
                    <div className="transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
                        <LicenseReview
                            initialData={licenseData}
                            onConfirm={handleConfirm}
                            onCancel={handleCancel}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
