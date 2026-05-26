"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
    Calendar, FileText, Users, BookOpen, CheckCircle, 
    Sparkles, ArrowRight, ShieldCheck, Play, HelpCircle, 
    ChevronDown, Menu, X, ArrowUpRight, Zap, Palette, School
} from "lucide-react";

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"horarios" | "licencias">("horarios");
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const faqs = [
        {
            q: "¿Cómo funciona el generador de horarios con IA?",
            a: "Nuestra IA analiza múltiples variables simultáneamente: horas curriculares, disponibilidad de profesores, capacidades de aulas y preferencias institucionales. En cuestión de segundos, genera una propuesta de horario optimizada y libre de conflictos."
        },
        {
            q: "¿Qué ocurre cuando un profesor sube una licencia médica?",
            a: "El sistema procesa la licencia e inmediatamente identifica a los profesores sustitutos idóneos que tengan horas disponibles. Se notifica al director para su aprobación y se actualizan los horarios en tiempo real en los portales correspondientes."
        },
        {
            q: "¿Cómo funciona el periodo de prueba de 14 días?",
            a: "El periodo de prueba es 100% gratuito y da acceso a todas las características premium de la plataforma. No requiere ingresar tarjeta de crédito. Al finalizar los 14 días, puedes elegir el plan que mejor se adapte a tu número de usuarios."
        },
        {
            q: "¿El Portal Docente tiene accesos restringidos?",
            a: "Sí. Los profesores ingresan a un perfil privado y seguro donde solo pueden modificar sus datos personales, ver sus horarios y registrar notas, planificaciones o alumnos en las asignaturas que tienen asignadas."
        },
        {
            q: "¿Se pueden exportar los horarios creados?",
            a: "Completamente. Puedes exportar los horarios finales en formatos PDF listos para imprimir o en archivos de Excel para su edición administrativa externa."
        }
    ];

    return (
        <div className="min-h-screen bg-sf-bg font-sans selection:bg-sf-teal selection:text-white relative">
            
            {/* Local Styles for premium school keyframes animations */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-10px) rotate(1.5deg); }
                }
                @keyframes float-medium {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-14px) rotate(-2deg); }
                }
                @keyframes float-fast {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-7px) rotate(3deg); }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 4px 16px rgba(42, 157, 143, 0.3); }
                    50% { box-shadow: 0 8px 28px rgba(42, 157, 143, 0.65); transform: translateY(-1px); }
                }
                .animate-float-1 { animation: float-slow 6s ease-in-out infinite; }
                .animate-float-2 { animation: float-medium 8s ease-in-out infinite; }
                .animate-float-3 { animation: float-fast 5s ease-in-out infinite; }
                .animate-pulse-glow { animation: pulse-glow 2.5s ease-in-out infinite; }
            `}} />

            {/* ─── NAVBAR CAPSULE GASSMORPHIC ─────────────────────────────── */}
            <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 sticky top-0 z-50">
                <header className="max-w-7xl mx-auto bg-white/75 backdrop-blur-lg border border-white/40 rounded-2xl shadow-lg transition-all duration-300">
                    <div className="px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-16">
                            {/* Logo */}
                            <div className="flex items-center gap-2.5">
                                <Image 
                                    src="/logo.png" 
                                    alt="Scholar Flow Logo" 
                                    width={38} 
                                    height={38} 
                                    className="drop-shadow-sm hover:scale-110 transition-transform duration-300 cursor-pointer" 
                                />
                                <div className="flex flex-col">
                                    <span className="font-black text-sm text-sf-navy tracking-tight leading-none">Scholar Flow</span>
                                    <span className="text-[8px] text-sf-teal font-extrabold uppercase tracking-widest mt-0.5">Inteligencia Escolar</span>
                                </div>
                            </div>

                            {/* Navigation Desktop */}
                            <nav className="hidden md:flex items-center gap-8 bg-slate-100/50 px-6 py-2 rounded-full border border-sf">
                                <a href="#caracteristicas" className="text-xs font-black uppercase tracking-wider text-sf-navy/80 hover:text-sf-teal transition-colors">Características</a>
                                <a href="#ia" className="text-xs font-black uppercase tracking-wider text-sf-navy/80 hover:text-sf-teal transition-colors">Tecnología IA</a>
                                <a href="#precios" className="text-xs font-black uppercase tracking-wider text-sf-navy/80 hover:text-sf-teal transition-colors">Planes</a>
                                <a href="#faq" className="text-xs font-black uppercase tracking-wider text-sf-navy/80 hover:text-sf-teal transition-colors">Preguntas</a>
                            </nav>

                            {/* CTAs Desktop */}
                            <div className="hidden md:flex items-center gap-3">
                                <Link 
                                    href="/login" 
                                    className="text-xs font-black uppercase tracking-wider text-sf-navy hover:text-sf-teal transition-colors px-3 py-2"
                                >
                                    Ingresar
                                </Link>
                                <Link 
                                    href="/register" 
                                    className="btn-sf-primary text-[10px] tracking-widest uppercase px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all"
                                >
                                    Probar Gratis
                                </Link>
                            </div>

                            {/* Mobile menu button */}
                            <div className="md:hidden">
                                <button 
                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                    className="p-2 text-sf-navy hover:text-sf-teal transition-colors focus:outline-none"
                                >
                                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile menu panel */}
                    {mobileMenuOpen && (
                        <div className="md:hidden border-t border-slate-100 px-6 py-5 space-y-4 bg-white/95 rounded-b-2xl animate-sf-fade">
                            <a 
                                href="#caracteristicas" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="block text-xs font-black uppercase text-sf-navy/80 py-2 hover:text-sf-teal"
                            >
                                Características
                            </a>
                            <a 
                                href="#ia" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="block text-xs font-black uppercase text-sf-navy/80 py-2 hover:text-sf-teal"
                            >
                                Tecnología IA
                            </a>
                            <a 
                                href="#precios" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="block text-xs font-black uppercase text-sf-navy/80 py-2 hover:text-sf-teal"
                            >
                                Planes
                            </a>
                            <a 
                                href="#faq" 
                                onClick={() => setMobileMenuOpen(false)}
                                className="block text-xs font-black uppercase text-sf-navy/80 py-2 hover:text-sf-teal"
                            >
                                Preguntas
                            </a>
                            <div className="h-px bg-slate-100 my-2" />
                            <div className="flex flex-col gap-2 pt-2">
                                <Link 
                                    href="/login" 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-full text-center text-xs font-black uppercase text-sf-navy py-2 hover:text-sf-teal"
                                >
                                    Iniciar Sesión
                                </Link>
                                <Link 
                                    href="/register" 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="btn-sf-primary w-full text-center block text-xs tracking-wider uppercase py-3"
                                >
                                    Probar Gratis 14 Días
                                </Link>
                            </div>
                        </div>
                    )}
                </header>
            </div>

            {/* ─── HERO SECTION ───────────────────────────────────────────── */}
            <section className="relative pt-8 pb-20 lg:pt-16 lg:pb-28 overflow-hidden">
                {/* School background patterns */}
                <div className="absolute inset-0 bg-notebook-grid opacity-60" />
                <div className="absolute top-24 left-10 w-72 h-72 rounded-full bg-sf-teal/10 blur-3xl" />
                <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-sf-blue/10 blur-3xl" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                        {/* Left column (Text & CTAs) */}
                        <div className="lg:col-span-6 text-left space-y-6">
                            {/* Gradient Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sf-teal/10 border border-sf-teal/20 text-sf-teal text-xs font-black uppercase tracking-wider">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Inteligencia Artificial Educativa</span>
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-sf-navy tracking-tight leading-tight">
                                Gestión Escolar Inteligente, <span className="text-sf-gradient-light">Horarios Sin Conflictos</span>
                            </h1>

                            {/* Subtitle */}
                            <p className="text-sm sm:text-base text-sf-muted font-semibold leading-relaxed">
                                Scholar Flow automatiza la planificación de horarios y gestiona licencias médicas con IA. Reduce semanas de papeleo manual a segundos y ofrece portales dedicados para docentes y directivos.
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                                <Link 
                                    href="/register" 
                                    className="btn-sf-primary w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-xs tracking-wider uppercase animate-pulse-glow"
                                >
                                    Probar Gratis 14 Días
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <a 
                                    href="#ia" 
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-white border border-sf rounded-xl text-sf-navy hover:text-sf-teal hover:border-sf-teal font-black text-xs tracking-wider uppercase transition-all shadow-sm"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    Ver IA en Acción
                                </a>
                            </div>
                        </div>

                        {/* Right column (Mockups + Floating Elements) */}
                        <div className="lg:col-span-6 relative flex justify-center">
                            {/* Glow behind mockup */}
                            <div className="absolute inset-0 bg-sf-gradient-light rounded-3xl opacity-10 blur-2xl" />

                            {/* Main Dashboard Mockup wrapper */}
                            <div className="relative w-full max-w-[500px] lg:max-w-none rounded-2xl overflow-hidden border border-sf shadow-sf-navy bg-white">
                                <div className="bg-sf-navy/90 px-4 py-3 flex items-center gap-2 border-b border-white/10">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                    <span className="text-[9px] text-white/50 font-mono ml-4 select-none">app.scholarflow.cl/dashboard</span>
                                </div>
                                <Image 
                                    src="/real-dashboard.png" 
                                    alt="Scholar Flow Dashboard Interface Mockup" 
                                    width={1200} 
                                    height={800} 
                                    className="w-full h-auto object-cover hover:scale-[1.01] transition-transform duration-500" 
                                    priority 
                                />
                            </div>

                            {/* Floating School Asset 1: Speech bubble license extraction */}
                            <div className="absolute -top-6 -left-6 bg-white border border-sf-teal/30 p-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-float-1 z-10 max-w-[220px]">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4 text-emerald-600 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-sf-navy leading-none">Licencia Procesada</p>
                                    <p className="text-[8px] text-sf-muted font-bold mt-1">Extracción de datos OCR completada</p>
                                </div>
                            </div>

                            {/* Floating School Asset 2: Subject replacement */}
                            <div className="absolute -bottom-8 -right-4 bg-white border border-sf-navy/10 p-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-float-2 z-10 max-w-[220px]">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                    <Zap className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-sf-navy leading-none">Reemplazo Asignado</p>
                                    <p className="text-[8px] text-sf-muted font-bold mt-1">Prof. María González (Física)</p>
                                </div>
                            </div>

                            {/* Floating School Asset 3: Paper plane SVG doodle */}
                            <div className="absolute top-1/2 -right-8 animate-float-3 pointer-events-none opacity-40">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-sf-teal fill-current">
                                    <path d="M21 3L3 10.5L10.5 13.5L13.5 21L21 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M10.5 13.5L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── STATS SECTION ──────────────────────────────────────────── */}
            <section className="bg-white border-y border-sf py-12 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { value: "80%", label: "Ahorro de Tiempo" },
                            { value: "0", label: "Conflictos de Horarios" },
                            { value: "24/7", label: "Portal Docente Activo" },
                            { value: "100%", label: "Gestión de Licencias Digital" },
                        ].map((stat, i) => (
                            <div key={i} className="space-y-1">
                                <p className="text-3xl sm:text-4xl font-black text-sf-gradient-light tracking-tight">{stat.value}</p>
                                <p className="text-xs sm:text-sm font-bold text-sf-navy/70 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FEATURES SECTION (IA EN ACCION) ────────────────────────── */}
            <section id="ia" className="py-20 lg:py-28 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl font-black text-sf-navy tracking-tight sm:text-4xl">
                            ¿Por qué usar Inteligencia Artificial?
                        </h2>
                        <p className="text-sm sm:text-base text-sf-muted mt-3 font-semibold">
                            La gestión escolar tradicional consume horas valiosas de directores y coordinadores. Nuestra IA resuelve los problemas más complejos de forma autónoma.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                        {/* Selector de Tabs */}
                        <div className="lg:col-span-5 space-y-6">
                            
                            {/* Tab 1 */}
                            <button 
                                onClick={() => setActiveTab("horarios")}
                                className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 ${
                                    activeTab === "horarios" 
                                        ? "bg-white border-sf-teal shadow-sf-teal/10 scale-[1.01]" 
                                        : "bg-transparent border-transparent hover:bg-white/40"
                                }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                        activeTab === "horarios" ? "bg-sf-teal text-white" : "bg-sf-border text-sf-navy"
                                    }`}>
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-sf-navy">Planificador Inteligente de Horarios</h3>
                                        <p className="text-xs sm:text-sm text-sf-muted mt-2 font-semibold">
                                            Asigna salas, profesores y cursos considerando restricciones complejas. Nuestra IA optimiza la carga docente y asegura bloques equilibrados.
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Tab 2 */}
                            <button 
                                onClick={() => setActiveTab("licencias")}
                                className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 ${
                                    activeTab === "licencias" 
                                        ? "bg-white border-sf-teal shadow-sf-teal/10 scale-[1.01]" 
                                        : "bg-transparent border-transparent hover:bg-white/40"
                                }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                        activeTab === "licencias" ? "bg-sf-teal text-white" : "bg-sf-border text-sf-navy"
                                    }`}>
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-sf-navy">Reemplazo Autónomo por Licencias</h3>
                                        <p className="text-xs sm:text-sm text-sf-muted mt-2 font-semibold">
                                            Al cargar una licencia médica, el sistema busca de inmediato profesores sustitutos idóneos, notifica a los involucrados y actualiza el calendario semanal.
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Representación visual de la pestaña activa */}
                        <div className="lg:col-span-7 relative">
                            <div className="absolute inset-0 bg-sf-gradient-light rounded-2xl opacity-10 blur-xl animate-pulse" />
                            <div className="relative bg-white border border-sf rounded-2xl p-4 sm:p-6 shadow-sf-navy overflow-hidden">
                                <Image 
                                    src="/real-horarios.png" 
                                    alt="Scholar Flow AI features dashboard interface preview" 
                                    width={700} 
                                    height={700} 
                                    className="w-full h-auto rounded-xl border border-sf object-cover hover:scale-[1.005] transition-transform duration-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── COMPREHENSIVE FEATURES GRID ────────────────────────────── */}
            <section id="caracteristicas" className="bg-white border-y border-sf py-20 lg:py-28 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-xs font-black text-sf-teal uppercase tracking-widest">Características</span>
                        <h2 className="text-3xl font-black text-sf-navy tracking-tight sm:text-4xl mt-2">
                            Todo lo que tu establecimiento necesita
                        </h2>
                        <p className="text-sm sm:text-base text-sf-muted mt-3 font-semibold">
                            Diseñado en estrecha colaboración con directivos docentes para cubrir las necesidades reales de los colegios chilenos.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: FileText,
                                title: "Lectura de Licencias con IA (OCR)",
                                desc: "Sube licencias médicas en PDF o imagen. Nuestra IA (LLM + OCR) extrae fechas de inicio, vigencia y datos críticos de forma automatizada, guardando el archivo digital para su descarga."
                            },
                            {
                                icon: Sparkles,
                                title: "Recomendador de Suplentes",
                                desc: "Al registrarse una licencia, el recomendador algorítmico analiza especialidades y horarios para sugerir de inmediato al docente de reemplazo ideal libre de colisiones."
                            },
                            {
                                icon: Zap,
                                title: "Asistente RAG con Juez de Veracidad",
                                desc: "Soporte técnico interactivo integrado. Responde dudas administrativas basándose estrictamente en el manual escolar, auditado en tiempo real por un Juez de Veracidad con IA."
                            },
                            {
                                icon: Palette,
                                title: "Personalización de Marca (Branding)",
                                desc: "Ajusta la paleta de colores (primario y secundario) y el logotipo de tu establecimiento. Los estilos se aplican dinámicamente tanto a directores como a portales docentes."
                            },
                            {
                                icon: Users,
                                title: "Portal Docente y Agenda Digital",
                                desc: "Acceso privado y seguro para profesores. Visualizan sus horarios escolares individuales, registran planificaciones de clases, eventos de agenda y notas de asignaturas."
                            },
                            {
                                icon: School,
                                title: "Cuenta Demo Gratuita Ilimitada",
                                desc: "Explora la plataforma de forma inmediata sin registrarte. Ingresa al entorno demo preconfigurado con profesores simulados, licencias y horarios de muestra para clientes."
                            }
                        ].map((feat, i) => {
                            const Icon = feat.icon;
                            return (
                                <div key={i} className="p-6 rounded-2xl bg-white border border-sf relative hover:shadow-sf-teal/5 transition-all duration-300 hover:scale-[1.02] overflow-hidden group">
                                    {/* Red margin line simulating a notebook sheet */}
                                    <div className="absolute top-0 bottom-0 left-4 w-px bg-red-400/40" />
                                    
                                    <div className="pl-6">
                                        <div className="w-10 h-10 rounded-xl bg-sf-gradient-light text-white flex items-center justify-center mb-5 shadow-sf-teal group-hover:scale-110 transition-transform duration-300">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-black text-base text-sf-navy">{feat.title}</h3>
                                        <p className="text-xs sm:text-sm text-sf-muted mt-3 leading-relaxed font-semibold">{feat.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── DEMO CALLOUT SECTION ───────────────────────────────────── */}
            <section className="bg-sf-bg py-16 relative overflow-hidden border-t border-sf">
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-sf-teal/5 blur-3xl" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="bg-gradient-to-br from-sf-navy to-sf-blue rounded-3xl p-8 md:p-12 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div className="max-w-xl text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black uppercase tracking-wider mb-5">
                                <Sparkles className="w-3.5 h-3.5 text-sf-teal-light animate-pulse" />
                                <span>Acceso Instantáneo</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                                Explora Scholar-Flow con nuestra Cuenta Demo Gratuita
                            </h2>
                            <p className="text-white/70 text-xs sm:text-sm mt-4 leading-relaxed font-semibold">
                                Hemos preparado un colegio completo con datos de prueba reales: 10 profesores asignados, cursos creados, mallas horarias estructuradas y licencias médicas simuladas. Inicia sesión directamente para ver el generador de horarios y el recomendador de suplentes en acción.
                            </p>
                        </div>
                        
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 min-w-[280px] sm:min-w-[340px] text-left relative overflow-hidden">
                            {/* Subtle line background inside demo credentials box */}
                            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-sf-teal-light/20 blur-xl" />
                            
                            <p className="text-xs font-black text-white/90 mb-4 tracking-wider uppercase">Credenciales de Acceso</p>
                            <div className="space-y-3.5">
                                <div>
                                    <p className="text-[10px] text-white/50 uppercase font-black">Correo Electrónico</p>
                                    <p className="text-xs font-mono font-bold bg-white/5 border border-white/8 px-3 py-2 rounded-xl mt-1 select-all select-text">
                                        admin@demo.scholarflow.app
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/50 uppercase font-black">Contraseña</p>
                                    <p className="text-xs font-mono font-bold bg-white/5 border border-white/8 px-3 py-2 rounded-xl mt-1 select-all select-text">
                                        1234
                                    </p>
                                </div>
                            </div>
                            <div className="mt-6">
                                <Link 
                                    href="/login" 
                                    className="w-full bg-white text-sf-navy hover:bg-slate-100 text-xs font-black rounded-xl py-3 shadow-lg flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.01]"
                                >
                                    <span>Ingresar al Panel</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-sf-teal" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── PRICING / TRIAL SECTION ────────────────────────────────── */}
            <section id="precios" className="py-20 lg:py-28 relative overflow-hidden">
                <div className="absolute inset-0 bg-dots-pattern opacity-10" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <span className="text-xs font-black text-sf-teal uppercase tracking-widest">Suscripción Flexible</span>
                        <h2 className="text-3xl font-black text-sf-navy tracking-tight sm:text-4xl mt-2">
                            Comienza gratis, paga según crezcas
                        </h2>
                        <p className="text-sm sm:text-base text-sf-muted mt-3 font-semibold">
                            Disfruta de la plataforma completa gratis por 14 días. Luego, paga una tarifa justa basada exclusivamente en la cantidad de usuarios activos.
                        </p>
                    </div>

                    <div className="max-w-md mx-auto bg-white border border-sf rounded-3xl p-8 shadow-sf-navy text-center relative hover:scale-[1.01] transition-transform duration-300">
                        <div className="absolute -top-4 right-6 bg-sf-gradient-green text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sf-teal animate-pulse">
                            Recomendado
                        </div>

                        <span className="text-xs font-bold text-sf-teal uppercase tracking-wider block mb-2">Plan Institucional</span>
                        <h3 className="text-2xl font-black text-sf-navy">Prueba Gratis</h3>
                        
                        <div className="my-6">
                            <span className="text-5xl font-black text-sf-navy">$0</span>
                            <span className="text-sf-muted text-sm font-semibold"> / 14 días</span>
                        </div>

                        <p className="text-xs sm:text-sm text-sf-muted font-semibold mb-6">
                            Sin tarjetas de crédito, sin compromisos. Prueba todas las funciones incluyendo la IA de horarios y gestión de licencias.
                        </p>

                        <div className="h-px bg-sf-border my-6" />

                        <ul className="text-left space-y-3.5 mb-8">
                            {[
                                "Generador de horarios con IA ilimitado",
                                "Procesamiento inteligente de licencias médicas",
                                "Portal Docente completo y agenda digital",
                                "Exportación ilimitada a PDF y Excel",
                                "Soporte técnico preferente en español"
                            ].map((feat, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-sf-navy/80">
                                    <CheckCircle className="w-4 h-4 text-sf-teal shrink-0 mt-0.5" />
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>

                        <Link 
                            href="/register" 
                            className="btn-sf-primary w-full flex items-center justify-center gap-2 py-4 text-sm hover:scale-[1.01]"
                        >
                            Comenzar 14 días gratis
                            <Zap className="w-4 h-4 fill-current" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── FAQ SECTION ────────────────────────────────────────────── */}
            <section id="faq" className="bg-white border-t border-sf py-20 lg:py-28 relative">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-xs font-black text-sf-teal uppercase tracking-widest">Resolviendo dudas</span>
                        <h2 className="text-3xl font-black text-sf-navy tracking-tight sm:text-4xl mt-2">
                            Preguntas Frecuentes
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div 
                                key={index} 
                                className="border border-sf rounded-2xl overflow-hidden transition-all duration-300 bg-sf-bg"
                            >
                                <button
                                    onClick={() => toggleFaq(index)}
                                    className="w-full flex justify-between items-center p-5 text-left font-black text-sf-navy text-sm sm:text-base hover:bg-white/50 transition-colors focus:outline-none"
                                >
                                    <span>{faq.q}</span>
                                    <ChevronDown className={`w-5 h-5 text-sf-teal transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
                                </button>
                                {openFaq === index && (
                                    <div className="p-5 pt-0 border-t border-sf/55 text-xs sm:text-sm text-sf-muted leading-relaxed font-semibold">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA FINAL BANNER ────────────────────────────────────────── */}
            <section className="bg-sf-gradient text-white py-16 lg:py-24 relative overflow-hidden text-center">
                <div className="absolute inset-0 bg-dots-pattern opacity-10" />
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                        Transforma la gestión de tu establecimiento hoy
                    </h2>
                    <p className="text-white/70 text-sm sm:text-base mt-4 max-w-2xl mx-auto font-semibold">
                        Optimiza horarios, reduce la carga administrativa docente y automatiza reemplazos de manera inteligente. Únete a los recintos escolares del futuro.
                    </p>
                    <div className="mt-8">
                        <Link 
                            href="/register" 
                            className="inline-flex items-center gap-2 bg-white text-sf-navy font-bold rounded-xl px-8 py-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm"
                        >
                            Comenzar Prueba Gratuita
                            <ArrowRight className="w-4 h-4 text-sf-teal" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── FOOTER ─────────────────────────────────────────────────── */}
            <footer className="bg-sf-navy text-white/60 border-t border-white/5 py-12 relative text-sm font-semibold">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/5 pb-8 mb-8">
                        {/* Brand */}
                        <div className="flex items-center gap-2.5 text-left">
                            <Image src="/logo.png" alt="Scholar Flow Logo" width={36} height={36} />
                            <div>
                                <span className="font-black text-sm text-white tracking-tight leading-none block">Scholar Flow</span>
                                <span className="text-[9px] text-sf-teal font-extrabold uppercase tracking-widest block mt-0.5">Inteligencia Escolar</span>
                            </div>
                        </div>

                        {/* Navigation Footer */}
                        <nav className="flex flex-wrap justify-center gap-6 text-xs font-bold text-white/50">
                            <a href="#caracteristicas" className="hover:text-white transition-colors">Características</a>
                            <a href="#ia" className="hover:text-white transition-colors">Tecnología IA</a>
                            <a href="#precios" className="hover:text-white transition-colors">Planes</a>
                            <a href="#faq" className="hover:text-white transition-colors">Preguntas</a>
                        </nav>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-white/30">
                        <div className="space-y-1 text-center sm:text-left">
                            <p>© {new Date().getFullYear()} Scholar Flow. Todos los derechos reservados. SaaS de Gestión Educativa Inteligente.</p>
                            <p className="text-[11px] text-white/40">
                                Creada por{" "}
                                <a 
                                    href="https://www.synapsedev.cl" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-sf-teal hover:text-sf-teal-light font-bold underline transition-colors"
                                >
                                    Synapse Dev
                                </a>
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <span>Chile</span>
                            <span>•</span>
                            <span>Privacidad</span>
                            <span>•</span>
                            <span>Términos</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
