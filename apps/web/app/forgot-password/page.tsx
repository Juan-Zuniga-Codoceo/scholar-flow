"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle, School } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
    const [email, setEmail]     = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`${API}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Ocurrió un error.");
            }
            setSuccess(data.message || "Se ha enviado un enlace a tu correo.");
        } catch (err: any) {
            setError(err.message || "Error al procesar la solicitud.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px]" />

            <div className="w-full max-w-md z-10">
                {/* Brand */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-3">
                        <School className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Scholar-Flow</h1>
                    <p className="text-slate-400 text-xs mt-1">Gestión Educacional Simplificada</p>
                </div>

                {/* Card */}
                <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-lg font-bold text-white tracking-tight">Recuperar contraseña</h2>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Ingresa tu correo registrado y te enviaremos las instrucciones para restablecer tu contraseña.
                        </p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300 font-medium leading-relaxed">{error}</p>
                        </div>
                    )}

                    {success ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-emerald-300 font-medium leading-relaxed">{success}</p>
                            </div>
                            <Link
                                href="/login"
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs font-bold transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" /> Volver a Iniciar Sesión
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-300 tracking-wide">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="ejemplo@scholarflow.cl"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:from-indigo-600/55 disabled:to-blue-600/55 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-[0.99] transition-all"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                                    </>
                                ) : (
                                    "Enviar Enlace"
                                )}
                            </button>

                            <Link
                                href="/login"
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" /> Volver al Inicio
                            </Link>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
