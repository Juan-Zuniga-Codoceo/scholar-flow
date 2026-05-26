"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    GraduationCap, User, BookOpen, LogOut, Menu, X, Calendar, ClipboardList
} from "lucide-react";
import { getUser, getToken, clearSession, type AuthUser } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";
import { fetchBranding, applyBranding } from "@/lib/branding";

const NAV = [
    { name: "Mi Perfil", href: "/profesor/perfil", icon: User },
    { name: "Mis Ramos", href: "/profesor/ramos", icon: BookOpen },
    { name: "Mi Agenda", href: "/profesor/agenda", icon: ClipboardList },
    { name: "Permisos", href: "/profesor/permisos", icon: Calendar },
];


export default function ProfesorLayout({ children }: { children: React.ReactNode }) {
    const API_URL  = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const pathname = usePathname();
    const router   = useRouter();
    const [user, setUser]       = useState<AuthUser | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [branding, setBranding] = useState<any>(null);

    useEffect(() => {
        const token = getToken();
        if (!token) { router.replace("/login"); return; }
        const u = getUser();
        if (!u || u.role !== "member") { router.replace("/login"); return; }
        setUser(u);

        const loadBrandingData = async () => {
            const b = await fetchBranding();
            setBranding(b);
            applyBranding(b);
        };
        loadBrandingData();
    }, [router]);

    const handleLogout = () => { clearSession(); router.push("/login"); };

    const initials = (user?.full_name || user?.email || "P")
        .split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);

    const SidebarContent = () => (
        <>
            {/* Brand */}
            <div className="h-16 flex items-center gap-3 px-6 border-b border-white/10">
                {branding?.logo_url ? (
                    <img 
                        src={`${API_URL}${branding.logo_url}`} 
                        alt="Logo" 
                        className="w-8 h-8 object-contain rounded bg-white/10 p-0.5" 
                    />
                ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                )}
                <div>
                    <p className="text-xs font-black text-white tracking-tight">Portal Docente</p>
                    <p className="text-[10px] text-white/60 truncate max-w-[130px]">
                        {branding?.name || user?.organization?.name || "Scholar-Flow"}
                    </p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-6 space-y-1">
                {NAV.map(item => {
                    const active = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                                active
                                    ? "bg-white text-sf-navy shadow-lg shadow-black/10"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* User footer */}
            <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-2 mb-3">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-black text-white">{initials}</span>
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">{user?.full_name || user?.email}</p>
                        <p className="text-[10px] text-white/50">Docente</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                </button>
            </div>
        </>
    );

    const gradientBgStyle = {
        background: 'linear-gradient(to bottom, var(--sf-navy) 0%, var(--sf-blue) 100%)'
    };

    const gradientHeaderStyle = {
        background: 'linear-gradient(to right, var(--sf-navy) 0%, var(--sf-blue) 100%)'
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Desktop sidebar */}
            <aside 
                className="hidden md:flex flex-col w-60 text-white shadow-xl"
                style={gradientBgStyle}
            >
                <SidebarContent />
            </aside>

            {/* Mobile */}
            <div className="flex md:hidden flex-col w-full min-h-screen">
                <header 
                    className="h-14 flex items-center justify-between px-4"
                    style={gradientHeaderStyle}
                >
                    <div className="flex items-center gap-2">
                        {branding?.logo_url ? (
                            <img 
                                src={`${API_URL}${branding.logo_url}`} 
                                alt="Logo" 
                                className="w-6 h-6 object-contain rounded bg-white/10 p-0.5" 
                            />
                        ) : (
                            <GraduationCap className="w-5 h-5 text-white" />
                        )}
                        <span className="text-sm font-black text-white">Portal Docente</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="[&_button]:text-white/80 [&_button:hover]:text-white [&_button]:hover:bg-white/10">
                            <NotificationBell />
                        </div>
                        <button onClick={() => setMenuOpen(!menuOpen)} className="text-white p-1">
                            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </header>
                {menuOpen && (
                    <div 
                        className="flex flex-col min-h-[50vh]"
                        style={gradientBgStyle}
                    >
                        <SidebarContent />
                    </div>
                )}
                <main className="flex-1">{children}</main>
            </div>

            {/* Desktop content */}
            <main className="hidden md:flex flex-col flex-1 overflow-y-auto">
                <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 flex-shrink-0">
                    <div />
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto bg-slate-50">
                    {children}
                </div>
            </main>
        </div>
    );
}
