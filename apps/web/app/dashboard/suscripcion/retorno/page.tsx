"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, RefreshCw, CreditCard, ArrowRight } from "lucide-react";
import { getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RetornoPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [verifying, setVerifying] = useState(true);
    const [status, setStatus] = useState<"success" | "error" | "pending">("pending");
    const [errorMsg, setErrorMsg] = useState("");

    const verifyPayment = async () => {
        try {
            const token = searchParams.get("token");
            if (!token) {
                // If there's no token, we can check the general history status
                const authToken = getToken();
                if (!authToken) {
                    router.replace("/login");
                    return;
                }
                
                const res = await fetch(`${API_URL}/billing/payments`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0 && data[0].status === "completed") {
                        setStatus("success");
                        setTimeout(() => {
                            router.push("/dashboard/suscripcion");
                        }, 3000);
                        return;
                    }
                }
                setStatus("error");
                setErrorMsg("No se proporcionó token de pago.");
                setVerifying(false);
                return;
            }

            // We poll the history or status to see if the webhook has marked it completed
            const authToken = getToken();
            let attempts = 0;
            const maxAttempts = 6;
            
            const check = async () => {
                try {
                    const res = await fetch(`${API_URL}/billing/payments`, {
                        headers: { Authorization: `Bearer ${authToken}` }
                    });
                    if (!res.ok) throw new Error("No se pudo conectar con el servidor.");
                    
                    const history = await res.json();
                    // Find payment matching this flow_token
                    const payment = history.find((p: any) => p.flow_token === token);
                    
                    if (payment) {
                        if (payment.status === "completed") {
                            setStatus("success");
                            setVerifying(false);
                            setTimeout(() => {
                                router.push("/dashboard/suscripcion");
                            }, 3000);
                            return true;
                        } else if (payment.status === "rejected" || payment.status === "failed") {
                            setStatus("error");
                            setErrorMsg("El pago fue rechazado o falló.");
                            setVerifying(false);
                            return true;
                        }
                    }
                    return false;
                } catch (err: any) {
                    console.error("Error polling payment status:", err);
                }
                return false;
            };

            // Start polling interval
            const interval = setInterval(async () => {
                attempts++;
                const done = await check();
                if (done || attempts >= maxAttempts) {
                    clearInterval(interval);
                    if (verifying && !done) {
                        setStatus("error");
                        setErrorMsg("El servidor no ha recibido la confirmación de Flow. Si realizaste el pago, se actualizará automáticamente en unos minutos.");
                        setVerifying(false);
                    }
                }
            }, 1500);

            // Execute immediately the first check
            await check();

        } catch (err: any) {
            console.error(err);
            setStatus("error");
            setErrorMsg("Ocurrió un error al verificar el estado de la transacción.");
            setVerifying(false);
        }
    };

    useEffect(() => {
        verifyPayment();
    }, [searchParams]);

    return (
        <div className="max-w-md mx-auto px-4 py-16 text-center">
            <div className="bg-white border border-slate-150 rounded-3xl p-8 shadow-md relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
                
                {verifying && (
                    <div className="space-y-6 py-6 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center relative">
                            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-600 animate-spin" />
                            <CreditCard className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Procesando tu pago</h2>
                            <p className="text-slate-400 text-xs mt-1.5 max-w-xs leading-relaxed">
                                Estamos verificando la aprobación de tu transacción con los servidores seguros de Flow.cl...
                            </p>
                        </div>
                    </div>
                )}

                {!verifying && status === "success" && (
                    <div className="space-y-6 py-6 flex flex-col items-center animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-bounce" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">¡Pago Recibido Exitosamente!</h2>
                            <p className="text-slate-500 text-xs mt-1.5 max-w-xs leading-relaxed">
                                Tu suscripción mensual ha sido renovada. Hemos activado tu acceso completo a todas las herramientas.
                            </p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold animate-pulse">Redireccionando al panel principal...</p>
                    </div>
                )}

                {!verifying && status === "error" && (
                    <div className="space-y-6 py-6 flex flex-col items-center animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/25">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Error al procesar pago</h2>
                            <p className="text-red-500 text-xs font-semibold mt-1 max-w-xs">
                                {errorMsg}
                            </p>
                            <p className="text-slate-400 text-xs mt-1.5 max-w-xs leading-relaxed">
                                Si el cargo se realizó en tu banco, la confirmación tardará unos instantes en reflejarse. Puedes revisar el historial de transacciones.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/dashboard/suscripcion")}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
                        >
                            Volver al Panel
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
