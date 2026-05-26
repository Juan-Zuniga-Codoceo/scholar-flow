"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle } from "lucide-react";
import { apiLogin, setSession, isAuthenticated } from "@/lib/auth";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated()) router.replace("/dashboard");
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await apiLogin(email, password);
            setSession(data);
            if (data.user.role === "member") {
                router.push("/profesor");
            } else {
                router.push("/dashboard");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* ── Panel izquierdo — Branding ──────────────────────────── */}
            <div className="hidden lg:flex flex-col w-[52%] bg-sf-gradient relative overflow-hidden">
                {/* Patrón de fondo */}
                <div className="absolute inset-0 bg-dots-pattern opacity-20" />
                
                {/* Formas decorativas */}
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-sf-teal/20 blur-3xl" />
                <div className="absolute top-1/2 -right-20 w-60 h-60 rounded-full bg-sf-green/15 blur-3xl" />

                {/* Contenido centrado */}
                <div className="relative flex flex-col items-center justify-center flex-1 p-12 text-white">
                    {/* Logo grande */}
                    <div className="mb-10">
                        <Image
                            src="/logo.png"
                            alt="Scholar Flow"
                            width={220}
                            height={220}
                            className="drop-shadow-2xl"
                            priority
                        />
                    </div>

                    <h1 className="text-4xl font-black tracking-tight text-center leading-tight">
                        Scholar Flow
                    </h1>
                    <p className="text-lg font-semibold text-white/70 mt-2 text-center tracking-wide">
                        Inteligencia en Administración Escolar
                    </p>

                    <div className="mt-10 space-y-4 w-full max-w-xs">
                        {[
                            { icon: "📋", label: "Gestión de horarios con IA" },
                            { icon: "👩‍🏫", label: "Control de profesores y ramos" },
                            { icon: "📊", label: "Licencias y permisos digitales" },
                            { icon: "🔔", label: "Notificaciones en tiempo real" },
                        ].map((f) => (
                            <div key={f.label} className="flex items-center gap-3 bg-white/8 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
                                <span className="text-xl">{f.icon}</span>
                                <span className="text-sm font-semibold text-white/85">{f.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer del panel */}
                <div className="relative p-8 text-center border-t border-white/10">
                    <p className="text-xs text-white/40 font-medium">
                        © {new Date().getFullYear()} Scholar Flow · Plataforma SaaS Educativa · Chile
                    </p>
                </div>
            </div>

            {/* ── Panel derecho — Formulario ──────────────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-center bg-sf-bg p-6 lg:p-12">
                {/* Logo mobile (solo en pantallas pequeñas) */}
                <div className="lg:hidden text-center mb-8">
                    <Image src="/logo.png" alt="Scholar Flow" width={80} height={80} className="mx-auto mb-3" />
                    <h1 className="text-2xl font-black text-sf-navy">Scholar Flow</h1>
                    <p className="text-sf-muted text-xs mt-1 font-medium">Inteligencia en Administración Escolar</p>
                </div>

                <div className="w-full max-w-[420px] animate-sf-fade">
                    {/* Header del formulario */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-sf-navy tracking-tight">Bienvenido de vuelta</h2>
                        <p className="text-sf-muted text-sm mt-1.5 font-medium">
                            Ingresa a tu institución educativa
                        </p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-2.5 p-3.5 mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-sf-navy/70 uppercase tracking-wider flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-sf-teal" />
                                Correo institucional
                            </label>
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="admin@institución.cl"
                                className="input-sf"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-sf-navy/70 uppercase tracking-wider flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-sf-teal" />
                                    Contraseña
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs font-bold text-sf-teal hover:text-sf-blue transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPass ? "text" : "password"}
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-sf pr-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(s => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sf-muted hover:text-sf-teal transition-colors"
                                >
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-sf-primary w-full flex items-center justify-center gap-2.5 py-3.5 text-sm"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Ingresando...
                                </span>
                            ) : (
                                <>
                                    <LogIn className="w-4.5 h-4.5" />
                                    Iniciar Sesión
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-sf-border" />
                        <span className="text-[11px] text-sf-muted font-semibold uppercase tracking-wider">o</span>
                        <div className="flex-1 h-px bg-sf-border" />
                    </div>

                    {/* Register link */}
                    <div className="text-center bg-white border border-sf rounded-xl p-4">
                        <p className="text-sf-muted text-sm font-medium">¿Tu institución no está registrada?</p>
                        <Link
                            href="/register"
                            className="inline-block mt-2 text-sm font-bold text-sf-teal hover:text-sf-blue transition-colors"
                        >
                            Crear cuenta gratuita — 14 días gratis →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
