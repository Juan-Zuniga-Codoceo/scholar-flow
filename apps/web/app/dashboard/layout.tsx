"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
    FileText, Users, BookOpen, Calendar, 
    LayoutDashboard, Menu, X, LogOut, 
    ShieldCheck, ClipboardCheck, CreditCard,
    Lock, AlertTriangle, ChevronRight, HelpCircle, Settings
} from "lucide-react";
import { getUser, getToken, clearSession, type AuthUser } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";
import ChatbotWidget from "@/components/dashboard/ChatbotWidget";
import { fetchBranding, applyBranding } from "@/lib/branding";

interface SidebarItem {
    name: string;
    href: string;
    icon: React.ComponentType<any>;
    badge?: string;
}

const navigation: SidebarItem[] = [
    { name: "Inicio", href: "/dashboard", icon: LayoutDashboard },
    { name: "Licencias Médicas", href: "/dashboard/licencias", icon: FileText },
    { name: "Profesores", href: "/dashboard/profesores", icon: Users },
    { name: "Cursos y Ramos", href: "/dashboard/cursos", icon: BookOpen },
    { name: "Horarios (IA)", href: "/dashboard/horarios", icon: Calendar },
    { name: "Permisos", href: "/dashboard/permisos", icon: ClipboardCheck },
    { name: "Suscripción", href: "/dashboard/suscripcion", icon: CreditCard },
    { name: "Guía de Uso", href: "/dashboard/tutorial", icon: HelpCircle },
];

interface BillingStatus {
    subscription_status: string;
    trial_ends_at: string | null;
    trial_days_left: number | null;
    subscription_ends_at: string | null;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const API_URL   = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const pathname  = usePathname();
    const router    = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
    const [loadingBilling, setLoadingBilling] = useState(true);
    const [profileOverride, setProfileOverride] = useState<{ name: string; email: string } | null>(null);
    const [branding, setBranding] = useState<any>(null);

    const loadLocalProfile = () => {
        const stored = localStorage.getItem("user_profile");
        if (stored) {
            try {
                const p = JSON.parse(stored);
                setProfileOverride({ name: p.name || "", email: p.email || "" });
            } catch {}
        } else {
            setProfileOverride(null);
        }
    };

    const fetchBillingStatus = async (token: string) => {
        try {
            const res = await fetch(`${API_URL}/billing/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setBillingStatus(await res.json());
        } catch {}
        finally { setLoadingBilling(false); }
    };

    useEffect(() => {
        const token = getToken();
        if (!token) { router.replace("/login"); return; }
        const user = getUser();
        setAuthUser(user);
        fetchBillingStatus(token);
        loadLocalProfile();

        const loadBrandingData = async () => {
            const b = await fetchBranding();
            setBranding(b);
            applyBranding(b);
        };
        loadBrandingData();

        window.addEventListener("storage", loadLocalProfile);
        window.addEventListener("sf-branding-updated", loadBrandingData);

        return () => {
            window.removeEventListener("storage", loadLocalProfile);
            window.removeEventListener("sf-branding-updated", loadBrandingData);
        };
    }, [router]);

    const handleLogout = () => { clearSession(); router.push("/login"); };

    const displayName  = profileOverride?.name  || authUser?.full_name  || authUser?.email || "Admin";
    const displayEmail = profileOverride?.email || authUser?.email || "";
    const orgName      = authUser?.organization?.name || "Scholar Flow";
    const initials     = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);

    // Billing checks
    const isFree       = billingStatus?.subscription_status === "free" || billingStatus?.subscription_status === "lifetime";
    const isTrial      = billingStatus?.subscription_status === "trialing";
    const isActive     = billingStatus?.subscription_status === "active";
    const isTrialExpired  = isTrial && billingStatus?.trial_ends_at && new Date(billingStatus.trial_ends_at) < new Date();
    const isActiveExpired = isActive && billingStatus?.subscription_ends_at && new Date(billingStatus.subscription_ends_at) < new Date();
    const isExpired    = billingStatus ? (!isFree && (isTrialExpired || isActiveExpired || (!isTrial && !isActive))) : false;
    const isBillingPage = pathname === "/dashboard/suscripcion" || pathname === "/dashboard/suscripcion/retorno";
    const showTrialWarning = isTrial && (billingStatus?.trial_days_left ?? 99) <= 3 && !isTrialExpired;

    // ── Sidebar nav ──────────────────────────────────────────────────────────
    const SidebarNav = () => {
        const navItems = authUser?.role === "admin"
            ? [...navigation, { name: "Personalización", href: "/dashboard/configuracion", icon: Settings }]
            : navigation;

        return (
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {navItems.map((item) => {
                    const isActiveItem = item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`sidebar-item ${isActiveItem ? "active" : ""}`}
                        >
                            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                            <span className="flex-1">{item.name}</span>
                            {isActiveItem && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                        </Link>
                    );
                })}
            </nav>
        );
    };

    // ── User footer ──────────────────────────────────────────────────────────
    const UserFooter = () => (
        <div className="p-3 border-t border-white/10">
            <Link href="/dashboard/perfil"
                className="flex items-center gap-3 p-2.5 hover:bg-white/8 rounded-xl transition-all cursor-pointer group mb-2"
            >
                <div className="w-8 h-8 rounded-full bg-sf-gradient-light flex items-center justify-center flex-shrink-0 shadow-sf-teal">
                    <span className="font-bold text-white text-xs">{initials}</span>
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/90 truncate">{displayName}</p>
                    <p className="text-[10px] text-white/40 truncate">{displayEmail}</p>
                </div>
                {authUser?.role === "admin" && (
                    <ShieldCheck className="w-3.5 h-3.5 text-sf-teal-light flex-shrink-0" />
                )}
            </Link>
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-white/40 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
            >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
            </button>
            <div className="mt-2.5 text-center">
                <a 
                    href="https://www.synapsedev.cl" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[9px] text-white/20 hover:text-sf-teal-light font-bold transition-colors"
                >
                    Creado por Synapse Dev
                </a>
            </div>
        </div>
    );

    // ── Locked Screen ────────────────────────────────────────────────────────
    const LockedScreen = () => (
        <div className="flex items-center justify-center p-8 min-h-[70vh]">
            <div className="max-w-sm w-full bg-white border border-sf rounded-2xl p-8 shadow-sf-navy text-center animate-sf-fade">
                <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
                    <Lock className="w-6 h-6 text-red-500 animate-sf-pulse" />
                </div>
                <h2 className="text-lg font-black text-sf-navy">Acceso Restringido</h2>
                <p className="text-sf-muted text-xs mt-3 leading-relaxed">
                    La suscripción de <strong>{orgName}</strong> ha expirado. Para seguir usando Scholar Flow debes renovar tu membresía.
                </p>
                {authUser?.role === "admin" ? (
                    <Link href="/dashboard/suscripcion"
                        className="btn-sf-primary mt-6 w-full flex items-center justify-center gap-2 text-sm"
                    >
                        Ir a Facturación
                    </Link>
                ) : (
                    <p className="mt-5 text-[10px] text-sf-muted italic bg-sf-bg border border-sf px-3 py-2 rounded-xl">
                        Contacta al administrador de tu institución para reactivar el servicio.
                    </p>
                )}
            </div>
        </div>
    );

    // ── Trial Warning Banner ──────────────────────────────────────────────────
    const TrialBanner = () => !showTrialWarning ? null : (
        <div className="bg-amber-500 text-slate-900 px-5 py-2 text-xs font-bold flex justify-between items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Quedan <strong>{billingStatus?.trial_days_left} días</strong> de tu prueba gratuita.</span>
            </div>
            {authUser?.role === "admin" && (
                <Link href="/dashboard/suscripcion"
                    className="bg-white text-amber-800 px-3 py-1 rounded-lg text-[10px] font-extrabold hover:bg-amber-50 transition-colors shrink-0"
                >
                    Suscribirse
                </Link>
            )}
        </div>
    );

    const PageContent = () => {
        if (loadingBilling) return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-[3px] border-sf-teal border-t-transparent rounded-full animate-spin" />
            </div>
        );
        if (isExpired && !isBillingPage) return <LockedScreen />;
        return <>{children}</>;
    };

    return (
        <div className="min-h-screen flex" style={{ background: "var(--sf-bg)" }}>

            {/* ── Sidebar Desktop ─────────────────────────────────────────── */}
            <aside className="hidden md:flex flex-col w-60 sidebar-sf text-white border-r border-white/8 flex-shrink-0">
                {/* Brand */}
                <div className="h-16 flex items-center gap-3 px-4 border-b border-white/10">
                    {branding?.logo_url ? (
                        <img 
                            src={`${API_URL}${branding.logo_url}`} 
                            alt={branding.name || "Scholar Flow"} 
                            className="w-9 h-9 object-contain rounded-lg drop-shadow-md" 
                        />
                    ) : (
                        <Image src="/logo.png" alt="Scholar Flow" width={36} height={36} className="drop-shadow-md" />
                    )}
                    <div>
                        <span className="font-black text-sm tracking-tight text-white block truncate max-w-[140px]">
                            {branding?.name || "Scholar Flow"}
                        </span>
                        <span className="block text-[10px] text-white/40 font-medium truncate max-w-[130px]">
                            {orgName}
                        </span>
                    </div>
                </div>

                <SidebarNav />
                <UserFooter />
            </aside>

            {/* ── Mobile header ───────────────────────────────────────────── */}
            <div className="flex md:hidden flex-col w-full min-h-screen">
                <header className="h-14 sidebar-sf text-white flex items-center justify-between px-4 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        {branding?.logo_url ? (
                            <img 
                                src={`${API_URL}${branding.logo_url}`} 
                                alt={branding.name || "Scholar Flow"} 
                                className="w-7 h-7 object-contain rounded drop-shadow-md" 
                            />
                        ) : (
                            <Image src="/logo.png" alt="Scholar Flow" width={28} height={28} />
                        )}
                        <span className="font-black text-sm">{branding?.name || "Scholar Flow"}</span>
                        <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-lg truncate max-w-[90px]">
                            {orgName}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="[&_button]:text-white/70 [&_button:hover]:text-white">
                            <NotificationBell />
                        </div>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 text-white/70 hover:text-white">
                            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </header>

                {isSidebarOpen && (
                    <div className="sidebar-sf border-b border-white/10 px-3 py-3">
                        <SidebarNav />
                        <UserFooter />
                    </div>
                )}

                <div className="flex-1 flex flex-col overflow-y-auto">
                    <TrialBanner />
                    <main className="flex-1 bg-sf-bg">
                        <PageContent />
                    </main>
                </div>
            </div>

            {/* ── Desktop Content ──────────────────────────────────────────── */}
            <main className="hidden md:flex flex-col flex-1 overflow-y-auto min-w-0">
                <TrialBanner />
                <header className="h-14 bg-white border-b border-sf flex items-center justify-between px-6 flex-shrink-0">
                    {/* Breadcrumb del pathname */}
                    <div className="text-xs text-sf-muted font-semibold capitalize tracking-wide">
                        {pathname.split("/").filter(Boolean).join(" › ")}
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto bg-sf-bg">
                    <PageContent />
                </div>
            </main>

            {/* AI Chatbot Support Widget */}
            <ChatbotWidget />
        </div>
    );
}
