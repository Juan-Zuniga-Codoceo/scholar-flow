"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
    UploadCloud, Check, RotateCcw, Palette, 
    Image as ImageIcon, Sliders, Save, School, Info
} from "lucide-react";
import { getToken, getUser } from "@/lib/auth";
import { fetchBranding, applyBranding } from "@/lib/branding";

const PRESET_PALETTES = [
    { name: "Scholar Flow (Original)", primary: "#2A9D8F", secondary: "#1E3A5F", desc: "Teal y Azul Marino" },
    { name: "Operia (Elegante)", primary: "#7209B7", secondary: "#0F0F1A", desc: "Violeta y Dark Blue" },
    { name: "Synapse Dev (Tecnológico)", primary: "#00B4D8", secondary: "#03045E", desc: "Cyan y Azul Real" },
    { name: "Esmeralda", primary: "#10B981", secondary: "#064E3B", desc: "Verde Esmeralda y Bosque" },
    { name: "Carmesí", primary: "#EF4444", secondary: "#450A0A", desc: "Rojo Carmesí y Bordeaux" },
];

export default function ConfigurarInstitucionPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [name, setName] = useState("");
    const [primaryColor, setPrimaryColor] = useState("#2A9D8F");
    const [secondaryColor, setSecondaryColor] = useState("#1E3A5F");
    
    // Status states
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Logo upload states
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    useEffect(() => {
        const u = getUser();
        if (!u || u.role !== "admin") {
            router.replace("/dashboard");
            return;
        }

        const loadData = async () => {
            try {
                const b = await fetchBranding();
                if (b) {
                    setName(b.name || u.organization?.name || "");
                    setPrimaryColor(b.primary_color || "#2A9D8F");
                    setSecondaryColor(b.secondary_color || "#1E3A5F");
                    setLogoUrl(b.logo_url);
                    if (b.logo_url) {
                        setLogoPreview(`${API_URL}${b.logo_url}`);
                    }
                }
            } catch (e) {
                console.error("Error loading branding info:", e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.match("image.*")) {
                setError("El archivo debe ser una imagen (PNG, JPG, SVG, WebP)");
                return;
            }
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handlePresetSelect = (primary: string, secondary: string) => {
        setPrimaryColor(primary);
        setSecondaryColor(secondary);
        setSuccess(null);
    };

    const handleResetLogo = async () => {
        setError(null);
        setSuccess(null);
        setLogoFile(null);
        setLogoPreview(null);
        setLogoUrl(null);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setSaving(true);

        const token = getToken();
        if (!token) {
            setError("Sesión expirada. Inicie sesión nuevamente.");
            setSaving(false);
            return;
        }

        try {
            // 1. If a new logo file was selected, upload it first
            let finalLogoUrl = logoUrl;
            if (logoFile) {
                const formData = new FormData();
                formData.append("file", logoFile);

                const resLogo = await fetch(`${API_URL}/api/organization/logo`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });

                if (!resLogo.ok) {
                    const data = await resLogo.json();
                    throw new Error(data.detail || "Error al subir el logotipo");
                }

                const dataLogo = await resLogo.json();
                finalLogoUrl = dataLogo.logo_url;
                setLogoUrl(dataLogo.logo_url);
                setLogoFile(null);
            } else if (logoPreview === null && logoUrl !== null) {
                // If logo was cleared
                const resDelLogo = await fetch(`${API_URL}/api/organization/logo`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!resDelLogo.ok) {
                    throw new Error("Error al restablecer el logotipo");
                }
            }

            // 2. Save institution name and colors
            const resBranding = await fetch(`${API_URL}/api/organization`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    primary_color: primaryColor,
                    secondary_color: secondaryColor,
                }),
            });

            if (!resBranding.ok) {
                const data = await resBranding.json();
                throw new Error(data.detail || "Error al guardar los colores");
            }

            // Trigger instant reactive layout reload
            applyBranding({
                id: "",
                name: name.trim(),
                subdomain: "",
                logo_url: finalLogoUrl,
                primary_color: primaryColor,
                secondary_color: secondaryColor
            });
            
            // Emit custom event so layout detects the updates
            window.dispatchEvent(new Event("sf-branding-updated"));
            
            setSuccess("¡Configuración institucional guardada correctamente!");
        } catch (e: any) {
            setError(e.message || "Error al guardar la configuración");
        } finally {
            setSaving(false);
        }
    };

    const handleRestoreDefaults = () => {
        setName("");
        setPrimaryColor("#2A9D8F");
        setSecondaryColor("#1E3A5F");
        setLogoFile(null);
        setLogoPreview(null);
        setLogoUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setError(null);
        setSuccess(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-9 h-9 border-4 border-sf-teal border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto animate-sf-fade">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-sf-navy flex items-center gap-2">
                        <School className="w-7 h-7 text-sf-teal" />
                        Personalización Institucional
                    </h1>
                    <p className="text-sf-muted text-xs mt-1">
                        Ajusta la apariencia visual de la plataforma con el nombre, colores y logotipo de tu institución.
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl">
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration form */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-sf shadow-sm p-6 md:p-8 flex flex-col justify-between">
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Institution Name */}
                        <div>
                            <label className="block text-xs font-black text-sf-navy mb-2">
                                Nombre de la Institución
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Colegio San Agustín"
                                className="w-full text-xs font-bold text-sf-navy bg-slate-50 border border-sf px-4 py-3 rounded-xl focus:outline-none focus:border-sf-teal transition-all"
                                required
                            />
                        </div>

                        {/* Logo Upload */}
                        <div>
                            <label className="block text-xs font-black text-sf-navy mb-2">
                                Logotipo Institucional
                            </label>
                            
                            <div className="flex items-center gap-5 p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                                <div className="w-16 h-16 rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-slate-300" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-3.5 py-1.5 bg-white border border-sf rounded-xl text-[11px] font-black text-sf-navy hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            <UploadCloud className="w-3.5 h-3.5" />
                                            Subir Imagen
                                        </button>
                                        
                                        {logoPreview && (
                                            <button
                                                type="button"
                                                onClick={handleResetLogo}
                                                className="px-3.5 py-1.5 bg-red-50 text-red-600 rounded-xl text-[11px] font-black hover:bg-red-100 transition-all flex items-center gap-1.5"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                Quitar
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-sf-muted mt-2">
                                        Formatos recomendados: PNG o SVG. Fondo transparente ideal.
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Color Selection */}
                        <div>
                            <label className="block text-xs font-black text-sf-navy mb-3">
                                Colores Institucionales
                            </label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border border-sf rounded-xl flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-black text-sf-navy">Color Primario</p>
                                        <p className="text-[9px] text-sf-muted">Botones y acciones principales</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-sf-navy font-mono">{primaryColor}</span>
                                        <input
                                            type="color"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 overflow-hidden"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 border border-sf rounded-xl flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-black text-sf-navy">Color Secundario</p>
                                        <p className="text-[9px] text-sf-muted">Fondo del menú lateral</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-sf-navy font-mono">{secondaryColor}</span>
                                        <input
                                            type="color"
                                            value={secondaryColor}
                                            onChange={(e) => setSecondaryColor(e.target.value)}
                                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 overflow-hidden"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preset Palettes */}
                        <div>
                            <label className="block text-xs font-black text-sf-navy mb-2 flex items-center gap-1">
                                <Palette className="w-4 h-4 text-sf-teal" />
                                Paletas de Marca Sugeridas
                            </label>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                {PRESET_PALETTES.map((preset) => {
                                    const active = primaryColor.toUpperCase() === preset.primary.toUpperCase() && 
                                                   secondaryColor.toUpperCase() === preset.secondary.toUpperCase();
                                    return (
                                        <button
                                            type="button"
                                            key={preset.name}
                                            onClick={() => handlePresetSelect(preset.primary, preset.secondary)}
                                            className={`p-2 border rounded-xl text-left hover:border-slate-300 transition-all ${
                                                active ? "border-sf-teal bg-slate-50 ring-1 ring-sf-teal" : "border-sf"
                                            }`}
                                        >
                                            <div className="flex gap-1 mb-1">
                                                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                                                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.secondary }} />
                                            </div>
                                            <p className="text-[9px] font-black text-sf-navy truncate">{preset.name}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Information box */}
                        <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex gap-2">
                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-blue-800 leading-relaxed font-bold">
                                Nota: Al guardar, la personalización se aplicará automáticamente a todos los docentes y administradores pertenecientes a esta institución.
                            </p>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-sf flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={handleRestoreDefaults}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black text-sf-navy transition-all"
                        >
                            Valores por Defecto
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            onClick={handleSave}
                            className="btn-sf-primary px-6 py-2.5 flex items-center justify-center gap-2 text-xs"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Guardar Configuración
                        </button>
                    </div>
                </div>

                {/* Right Column: Live Mockup Preview */}
                <div className="lg:col-span-5 flex flex-col">
                    <div className="bg-slate-100 rounded-2xl p-4 border border-sf flex-1 flex flex-col">
                        <p className="text-xs font-black text-sf-navy mb-3 flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-sf-teal" />
                            Previsualización en Tiempo Real
                        </p>
                        
                        <div className="bg-white rounded-xl border border-slate-200 shadow-md flex flex-1 overflow-hidden min-h-[450px]">
                            {/* Mock Sidebar */}
                            <div 
                                className="w-36 text-white p-3 flex flex-col justify-between transition-all duration-300"
                                style={{
                                    background: `linear-gradient(to bottom, ${secondaryColor} 0%, ${secondaryColor}dd 100%)`
                                }}
                            >
                                <div>
                                    {/* Mock logo & brand */}
                                    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-white/10">
                                        <div className="w-7 h-7 bg-white/15 rounded flex items-center justify-center overflow-hidden shrink-0">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-0.5" />
                                            ) : (
                                                <span className="text-[10px] font-bold">🏫</span>
                                            )}
                                        </div>
                                        <span className="text-[9px] font-black truncate block flex-1">
                                            {name || "Nombre Colegio"}
                                        </span>
                                    </div>
                                    
                                    {/* Mock links */}
                                    <div className="space-y-1">
                                        <div className="h-6 rounded bg-white/10 flex items-center px-2 gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
                                            <span className="text-[8px] font-bold">Inicio</span>
                                        </div>
                                        <div className="h-6 rounded hover:bg-white/5 flex items-center px-2 gap-1.5 opacity-60">
                                            <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
                                            <span className="text-[8px] font-bold">Docentes</span>
                                        </div>
                                        <div className="h-6 rounded hover:bg-white/5 flex items-center px-2 gap-1.5 opacity-60">
                                            <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
                                            <span className="text-[8px] font-bold">Horarios</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/10 opacity-70">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-white/20 shrink-0" />
                                        <div className="overflow-hidden">
                                            <p className="text-[8px] font-bold truncate">Mi Perfil</p>
                                            <p className="text-[6px] opacity-60">Admin</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mock Dashboard body */}
                            <div className="flex-1 bg-slate-50 p-4 flex flex-col justify-between">
                                <div>
                                    {/* Mock header */}
                                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-200 mb-4">
                                        <div className="h-2.5 w-16 bg-slate-200 rounded" />
                                        <div className="h-4 w-4 bg-slate-200 rounded-full" />
                                    </div>

                                    {/* Mock Card */}
                                    <div className="bg-white p-3 border border-slate-150 rounded-lg shadow-sm">
                                        <div className="h-3 w-28 bg-slate-300 rounded mb-2" />
                                        <div className="h-2.5 w-full bg-slate-150 rounded mb-1.5" />
                                        <div className="h-2.5 w-5/6 bg-slate-150 rounded mb-3" />
                                        
                                        {/* Mock Button with primary color */}
                                        <button 
                                            type="button"
                                            className="px-3 py-1.5 text-[8px] font-bold text-white rounded-md transition-all flex items-center gap-1"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <span>Acción Principal</span>
                                            <Check className="w-2 h-2" />
                                        </button>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <span className="text-[7px] text-slate-300 font-bold">Scholar-Flow System</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
