"use client";

import { useState, useEffect } from "react";
import { User, Shield, Phone, Mail, Clock, Save, CheckCircle, GraduationCap } from "lucide-react";

export default function UserProfilePage() {
    const [profile, setProfile] = useState({
        name: "Admin Demo",
        role: "Director Académico",
        phone: "+56 9 8765 4321",
        email: "admin@demo.cl",
        hours: "44 horas semanales"
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("user_profile");
        if (stored) {
            try {
                setProfile(JSON.parse(stored));
            } catch (e) {
                console.error("Error reading profile from localStorage:", e);
            }
        }
    }, []);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem("user_profile", JSON.stringify(profile));
        setSaved(true);
        // Trigger storage event so that layout updates in real-time
        window.dispatchEvent(new Event("storage"));
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="min-h-screen bg-slate-50/50 bg-notebook-grid p-6 md:p-8 font-sans">
            {/* Header */}
            <div className="mb-8 max-w-2xl mx-auto">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full uppercase tracking-wider">
                        Configuración
                    </span>
                    <span className="text-slate-400 text-xs font-semibold">Perfil del Usuario</span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2 flex items-center gap-2.5">
                    Mi Perfil <User className="w-8 h-8 text-blue-600" />
                </h1>
                <p className="text-slate-500 mt-1 text-sm">
                    Administra tus datos personales, cargo institucional y horas de dedicación.
                </p>
            </div>

            {/* Profile Card */}
            <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-notebook-grid opacity-10"></div>
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-3xl font-black shadow-lg">
                            {profile.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">{profile.name}</h2>
                            <p className="text-blue-100/90 text-sm font-semibold flex items-center gap-1.5 mt-1">
                                <Shield className="w-4 h-4" /> {profile.role}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="p-8 space-y-6">
                    {saved && (
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 animate-in fade-in duration-200">
                            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                            <span className="text-sm font-semibold">¡Perfil guardado con éxito y sincronizado!</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nombre completo */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <User className="w-4 h-4 text-slate-400" /> Nombre Completo
                            </label>
                            <input
                                type="text"
                                required
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                            />
                        </div>

                        {/* Rango / Rol */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Shield className="w-4 h-4 text-slate-400" /> Rango / Cargo
                            </label>
                            <input
                                type="text"
                                required
                                value={profile.role}
                                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                            />
                        </div>

                        {/* Teléfono */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Phone className="w-4 h-4 text-slate-400" /> Teléfono
                            </label>
                            <input
                                type="text"
                                required
                                value={profile.phone}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Mail className="w-4 h-4 text-slate-400" /> Email Institucional
                            </label>
                            <input
                                type="email"
                                required
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                            />
                        </div>

                        {/* Horas de Trabajo */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-slate-400" /> Horas de Trabajo Semanales
                            </label>
                            <input
                                type="text"
                                required
                                value={profile.hours}
                                onChange={(e) => setProfile({ ...profile, hours: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
                        <button
                            type="submit"
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <Save className="w-5 h-5" />
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
