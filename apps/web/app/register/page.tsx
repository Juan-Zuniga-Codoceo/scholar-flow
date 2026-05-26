"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Building2, User, Mail, Lock, Eye, EyeOff,
    ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Globe, Loader2, Sparkles
} from "lucide-react";
import { apiRegister, checkSubdomain, setSession, isAuthenticated } from "@/lib/auth";

type Step = 1 | 2;

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // remove accents
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep]         = useState<Step>(1);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [showPass, setShowPass] = useState(false);

    // Step 1 fields
    const [orgName, setOrgName]       = useState("");
    const [subdomain, setSubdomain]   = useState("");
    const [subdomainAuto, setSubdomainAuto] = useState(true);  // auto-fill subdomain from orgName

    // Subdomain availability
    const [checking, setChecking]     = useState(false);
    const [available, setAvailable]   = useState<boolean | null>(null);

    // Step 2 fields
    const [fullName, setFullName]       = useState("");
    const [email, setEmail]             = useState("");
    const [password, setPassword]       = useState("");
    const [confirmPass, setConfirmPass] = useState("");

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated()) router.replace("/dashboard");
    }, [router]);

    // Auto-fill subdomain when orgName changes
    useEffect(() => {
        if (subdomainAuto && orgName) {
            setSubdomain(slugify(orgName));
        }
    }, [orgName, subdomainAuto]);

    // Debounced subdomain check
    const verifySubdomain = useCallback(async (slug: string) => {
        if (!slug || slug.length < 2) { setAvailable(null); return; }
        setChecking(true);
        try {
            const res = await checkSubdomain(slug);
            setAvailable(res.available);
            setSubdomain(res.subdomain); // use sanitized version from server
        } catch {
            setAvailable(null);
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => verifySubdomain(subdomain), 600);
        return () => clearTimeout(timer);
    }, [subdomain, verifySubdomain]);

    // ── Step 1 submit ───────────────────────────────────
    const handleStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (available === false) { setError("El subdominio no está disponible. Elige otro."); return; }
        if (!subdomain) { setError("El subdominio es requerido."); return; }
        setStep(2);
    };

    // ── Step 2 submit ───────────────────────────────────
    const handleStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPass) { setError("Las contraseñas no coinciden."); return; }
        if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }

        setLoading(true);
        try {
            const data = await apiRegister({
                org_name: orgName,
                subdomain,
                admin_email: email,
                admin_password: password,
                admin_full_name: fullName,
            });
            setSession(data);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message);
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    // ── Subdomain status indicator ─────────────────────
    const subdomainStatus = () => {
        if (!subdomain || subdomain.length < 2) return null;
        if (checking) return (
            <span className="flex items-center gap-1 text-slate-400 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
            </span>
        );
        if (available === true) return (
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-3 h-3" /> Disponible
            </span>
        );
        if (available === false) return (
            <span className="flex items-center gap-1 text-red-400 text-xs font-bold">
                <AlertCircle className="w-3 h-3" /> No disponible
            </span>
        );
        return null;
    };

    return (
        <div className="min-h-screen bg-sf-bg flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-notebook-grid opacity-5" />
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-3xl" />

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Image src="/logo.png" alt="Scholar Flow" width={120} height={120} className="mx-auto mb-4 drop-shadow-md" />
                    <h1 className="text-2xl font-black text-sf-navy tracking-tight">Scholar Flow</h1>
                    <p className="text-sf-muted text-sm mt-1 font-medium">
                        Registra tu institución — 14 días gratis
                    </p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-3 mb-6">
                    {[1, 2].map(s => (
                        <div key={s} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                                step === s
                                    ? "bg-sf-gradient-light text-white shadow-sf-teal"
                                    : step > s
                                        ? "bg-emerald-500 text-white"
                                        : "bg-sf-border text-sf-muted"
                            }`}>
                                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                            </div>
                            {s === 1 && (
                                <>
                                    <span className={`text-xs font-bold ${
                                        step === 1 ? "text-sf-navy" : "text-sf-muted"
                                    }`}>
                                        Institución
                                    </span>
                                    <div className={`w-8 h-0.5 rounded ${
                                        step > 1 ? "bg-emerald-400" : "bg-sf-border"
                                    }`} />
                                </>
                            )}
                            {s === 2 && (
                                <span className={`text-xs font-bold ${
                                    step === 2 ? "text-sf-navy" : "text-sf-muted"
                                }`}>
                                    Administrador
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="bg-white border border-sf shadow-sf-navy rounded-3xl p-8 shadow-2xl">

                    {error && (
                        <div className="flex items-center gap-2.5 p-3.5 mb-5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm font-medium">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* ─── STEP 1: Institution ────────────────────────── */}
                    {step === 1 && (
                        <form onSubmit={handleStep1} className="space-y-5">
                            <div>
                                <h2 className="text-xl font-bold text-sf-navy mb-1">Datos de la Institución</h2>
                                <p className="text-sf-muted text-sm">Ingresa el nombre y URL de tu establecimiento.</p>
                            </div>

                            {/* Org Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5" /> Nombre del Establecimiento
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={orgName}
                                    onChange={e => setOrgName(e.target.value)}
                                    placeholder="Ej: Colegio San Pedro"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sf-teal/50 focus:border-sf-teal/50 transition-all"
                                />
                            </div>

                            {/* Subdomain */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5" /> Subdominio
                                    </label>
                                    {subdomainStatus()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        required
                                        value={subdomain}
                                        onChange={e => {
                                            setSubdomainAuto(false);
                                            setSubdomain(slugify(e.target.value));
                                            setAvailable(null);
                                        }}
                                        placeholder="colegio-san-pedro"
                                        className={`flex-1 px-4 py-3 bg-white/5 border rounded-xl text-white placeholder:text-slate-500 text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                                            available === false
                                                ? "border-red-500/50 focus:ring-red-500/30"
                                                : available === true
                                                    ? "border-emerald-500/50 focus:ring-emerald-500/30"
                                                    : "border-white/10 focus:ring-sf-teal/50 focus:border-sf-teal/50"
                                        }`}
                                    />
                                </div>
                                {/* Preview */}
                                {subdomain && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono px-1">
                                        <span className="text-sf-teal font-bold">{subdomain}</span>
                                        <span>.scholarflow.cl</span>
                                        {subdomainAuto && (
                                            <button
                                                type="button"
                                                className="ml-1 text-slate-600 hover:text-slate-400 text-[10px] underline"
                                                onClick={() => setSubdomainAuto(false)}
                                            >
                                                Personalizar
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={available === false || checking}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-sf-blue to-sf-teal text-white font-bold rounded-xl shadow-lg shadow-sf-teal/25 hover:shadow-sf-teal/40 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                            >
                                Continuar <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    )}

                    {/* ─── STEP 2: Admin user ─────────────────────────── */}
                    {step === 2 && (
                        <form onSubmit={handleStep2} className="space-y-5">
                            <div>
                                <h2 className="text-xl font-bold text-sf-navy mb-1">Cuenta del Administrador</h2>
                                <p className="text-sf-muted text-sm">
                                    Crea el primer usuario administrador de{" "}
                                    <span className="text-sf-teal font-bold">{orgName}</span>.
                                </p>
                            </div>

                            {/* Summary banner */}
                            <div className="flex items-center gap-3 p-3 bg-sf-teal/10/10 border border-sf-teal/20 rounded-xl">
                                <Globe className="w-4 h-4 text-sf-teal flex-shrink-0" />
                                <div className="text-xs">
                                    <span className="text-slate-400">Subdominio: </span>
                                    <span className="text-sf-teal-light font-bold font-mono">{subdomain}.scholarflow.cl</span>
                                </div>
                            </div>

                            {/* Full name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> Nombre Completo
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="Director / Administrador"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sf-teal/50 focus:border-sf-teal/50 transition-all"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" /> Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="director@institución.cl"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sf-teal/50 focus:border-sf-teal/50 transition-all"
                                />
                            </div>

                            {/* Password */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5" /> Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPass ? "text" : "password"}
                                            required
                                            minLength={8}
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Min. 8 chars"
                                            className="w-full px-3 py-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sf-teal/50 focus:border-sf-teal/50 transition-all"
                                        />
                                        <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        Confirmar
                                    </label>
                                    <input
                                        type={showPass ? "text" : "password"}
                                        required
                                        autoComplete="new-password"
                                        value={confirmPass}
                                        onChange={e => setConfirmPass(e.target.value)}
                                        placeholder="Repetir"
                                        className={`w-full px-3 py-3 bg-white/5 border rounded-xl text-white placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                                            confirmPass && password !== confirmPass
                                                ? "border-red-500/50 focus:ring-red-500/30"
                                                : "border-white/10 focus:ring-sf-teal/50 focus:border-sf-teal/50"
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setStep(1); setError(null); }}
                                    className="flex items-center gap-1.5 px-4 py-3 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 rounded-xl text-sm font-bold transition-all"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Atrás
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-sf-blue to-sf-teal text-white font-bold rounded-xl shadow-lg shadow-sf-teal/25 hover:shadow-sf-teal/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Creando institución...
                                        </span>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" /> Crear Institución
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Login link */}
                <p className="text-center text-slate-500 text-sm mt-6 font-medium">
                    ¿Ya tienes una cuenta?{" "}
                    <Link href="/login" className="text-sf-teal hover:text-sf-teal-light font-bold transition-colors">
                        Iniciar sesión →
                    </Link>
                </p>
            </div>
        </div>
    );
}
