"use client";

import { useState } from "react";
import { 
    BookOpen, Calendar, Clock, FileText, HelpCircle, 
    Sparkles, Users, Lightbulb, ChevronDown, ChevronUp, 
    ArrowRight, CheckCircle2, ShieldCheck, Award
} from "lucide-react";

interface FAQItem {
    question: string;
    answer: string;
}

export default function TutorialPage() {
    const [activeTab, setActiveTab] = useState<"general" | "licencias" | "horarios">("general");
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

    const faqs: FAQItem[] = [
        {
            question: "¿Cómo funciona la IA para recomendar suplentes?",
            answer: "El motor de inteligencia artificial de Scholar-Flow analiza en tiempo real las asignaturas del docente ausente, cruza esta información con las especialidades de los docentes disponibles, y prioriza según su carga horaria contratada restante y su disponibilidad para evitar conflictos de horario."
        },
        {
            question: "¿Qué tipos de documentos de licencias médicas son compatibles?",
            answer: "Scholar-Flow es compatible con imágenes (PNG, JPEG, WEBP) y archivos PDF. La IA extrae de forma automática el RUT, nombre, días de licencia, código de diagnóstico e institución de salud emisora."
        },
        {
            question: "¿Cómo puedo cambiar el estado de disponibilidad de un profesor?",
            answer: "En la nómina de profesores, al hacer clic en el botón 'Editar Ficha del Docente' o en el estado de disponibilidad del listado, puedes activar o desactivar la casilla 'Disponible para reemplazos'. Si se desactiva, la IA lo excluirá de las recomendaciones automáticas."
        },
        {
            question: "¿Qué pasa si asigno un reemplazo y el profesor no tiene horas de contrato suficientes?",
            answer: "El sistema permite realizar la asignación, pero mostrará una advertencia de sobrecarga indicando la cantidad de horas asignadas vs. contratadas. Esto permite flexibilidad administrativa mientras mantiene visibilidad de la carga de trabajo."
        }
    ];

    const toggleFAQ = (index: number) => {
        setExpandedFAQ(expandedFAQ === index ? null : index);
    };

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-300">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 md:p-12 rounded-3xl border border-slate-700/30 text-white shadow-2xl">
                <div className="absolute inset-0 bg-notebook-grid opacity-[0.03]" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
                
                <div className="relative max-w-2xl space-y-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/20 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" /> Guía Completa de Scholar-Flow
                    </span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
                        Aprende a Optimizar tu Gestión Escolar con IA
                    </h1>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed font-medium">
                        Scholar-Flow automatiza la lectura de licencias médicas, recomienda suplentes idóneos y optimiza la malla horaria escolar en cuestión de segundos. Descubre las herramientas a tu disposición.
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("general")}
                    className={`pb-4 px-6 font-bold text-sm tracking-tight transition-all relative ${
                        activeTab === "general"
                            ? "text-blue-600 border-b-2 border-blue-600 font-extrabold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    Conceptos Generales
                </button>
                <button
                    onClick={() => setActiveTab("licencias")}
                    className={`pb-4 px-6 font-bold text-sm tracking-tight transition-all relative ${
                        activeTab === "licencias"
                            ? "text-blue-600 border-b-2 border-blue-600 font-extrabold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    Gestión de Licencias e IA
                </button>
                <button
                    onClick={() => setActiveTab("horarios")}
                    className={`pb-4 px-6 font-bold text-sm tracking-tight transition-all relative ${
                        activeTab === "horarios"
                            ? "text-blue-600 border-b-2 border-blue-600 font-extrabold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    Planificación de Horarios
                </button>
            </div>

            {/* Tab Contents */}
            <div className="space-y-8">
                {activeTab === "general" && (
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 hover:-translate-y-1 transition-all duration-200">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">1. Nómina Docente</h3>
                            <p className="text-slate-600 text-xs leading-relaxed font-medium">
                                Mantén un listado actualizado de tus profesores. Configura sus RUT, asignaturas específicas de especialidad, horas de contrato semanales y tipo de contrato (Planta, Reemplazo u Honorarios).
                            </p>
                            <div className="pt-2 flex items-center gap-1 text-xs font-bold text-blue-600">
                                Ir a Profesores <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 hover:-translate-y-1 transition-all duration-200">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <FileText className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">2. Licencias e IA</h3>
                            <p className="text-slate-600 text-xs leading-relaxed font-medium">
                                Sube el documento físico de la licencia médica. Nuestra IA la analiza, extrae los datos clave en segundos y sugiere al instante candidatos calificados de tu nómina para cubrir los bloques ausentes.
                            </p>
                            <div className="pt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
                                Ir a Licencias <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 hover:-translate-y-1 transition-all duration-200">
                            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">3. Planificación Horaria</h3>
                            <p className="text-slate-600 text-xs leading-relaxed font-medium">
                                Construye la malla horaria del colegio. Vincula cursos, asignaturas y profesores. Configura bloques horarios específicos y visualiza conflictos de tope horario en tiempo real.
                            </p>
                            <div className="pt-2 flex items-center gap-1 text-xs font-bold text-violet-600">
                                Ir a Horarios <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "licencias" && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-600" /> Flujo de Carga y Optimización de Reemplazos
                            </h3>
                            
                            <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                {/* Step 1 */}
                                <div className="relative space-y-1">
                                    <div className="absolute -left-8 top-0.5 w-6.5 h-6.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">1</div>
                                    <h4 className="text-sm font-black text-slate-800">Subir el documento de licencia</h4>
                                    <p className="text-slate-500 text-xs leading-relaxed font-medium">
                                        Arrastra el PDF o imagen de la licencia en la sección de 'Licencias Médicas &gt; Subir Licencia'. El motor inteligente Gemini iniciará la lectura de inmediato.
                                    </p>
                                </div>
                                
                                {/* Step 2 */}
                                <div className="relative space-y-1">
                                    <div className="absolute -left-8 top-0.5 w-6.5 h-6.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">2</div>
                                    <h4 className="text-sm font-black text-slate-800">Verificación de datos extraídos</h4>
                                    <p className="text-slate-500 text-xs leading-relaxed font-medium">
                                        Revisa el formulario con los campos completados por la IA: RUT del docente, cantidad de días, vigencia del período, diagnóstico e institución. Modifica cualquier dato si es necesario.
                                    </p>
                                </div>

                                {/* Step 3 */}
                                <div className="relative space-y-1">
                                    <div className="absolute -left-8 top-0.5 w-6.5 h-6.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">3</div>
                                    <h4 className="text-sm font-black text-slate-800">Búsqueda Automática de Candidatos</h4>
                                    <p className="text-slate-500 text-xs leading-relaxed font-medium">
                                        Al hacer clic en 'Confirmar y Buscar Reemplazo', el sistema cruzará las asignaturas del docente ausente con las especialidades y las horas disponibles de toda la nómina docente.
                                    </p>
                                </div>

                                {/* Step 4 */}
                                <div className="relative space-y-1">
                                    <div className="absolute -left-8 top-0.5 w-6.5 h-6.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">4</div>
                                    <h4 className="text-sm font-black text-slate-800">Asignar Reemplazo Final</h4>
                                    <p className="text-slate-500 text-xs leading-relaxed font-medium">
                                        En el panel lateral interactivo, selecciona al profesor recomendado de tu agrado y haz clic en 'Asignar'. La licencia quedará registrada y los bloques horarios se actualizarán.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
                            <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-blue-900">Consejo Pro: Vínculos Rápidos a Fichas</h4>
                                <p className="text-blue-700 text-xs leading-relaxed font-medium">
                                    En la tabla de historial de licencias médicas, puedes hacer clic directamente en el nombre de cualquier docente. El sistema te redirigirá a la nómina y desplegará automáticamente la ficha de carga horaria y especialidades para facilitar tu análisis.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "horarios" && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-violet-600" /> Planificación Estratégica de Horarios
                            </h3>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                        <BookOpen className="w-4.5 h-4.5 text-violet-600" /> Malla de Cursos y Ramos
                                    </div>
                                    <p className="text-slate-600 text-xs leading-relaxed">
                                        Crea tus cursos (ej: 1° Medio A) y vincula las asignaturas que cursan, definiendo las horas pedagógicas semanales requeridas para cada una de ellas.
                                    </p>
                                </div>
                                <div className="space-y-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                        <Clock className="w-4.5 h-4.5 text-emerald-600" /> Gestión de Bloques Libres
                                    </div>
                                    <p className="text-slate-600 text-xs leading-relaxed">
                                        Asigna docentes a cada asignatura. El planificador detectará de inmediato si el profesor tiene asignaciones que superan sus horas contratadas globales o si existe tope de horario.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* FAQs Section */}
            <div className="space-y-4">
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-slate-700" /> Preguntas Frecuentes
                </h3>
                
                <div className="space-y-3">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                            <button
                                onClick={() => toggleFAQ(idx)}
                                className="w-full px-6 py-4.5 text-left flex items-center justify-between hover:bg-slate-50/40 transition-colors"
                            >
                                <span className="text-sm font-bold text-slate-800">{faq.question}</span>
                                {expandedFAQ === idx ? (
                                    <ChevronUp className="w-4 h-4 text-slate-500" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                )}
                            </button>
                            {expandedFAQ === idx && (
                                <div className="px-6 pb-5 pt-1 border-t border-slate-100">
                                    <p className="text-slate-600 text-xs leading-relaxed font-medium">{faq.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
