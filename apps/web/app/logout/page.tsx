"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { clearSession } from "@/lib/auth";

export default function LogoutPage() {
    const router = useRouter();

    useEffect(() => {
        // Clear auth details from storage
        clearSession();
        // Clear any specific overrides
        localStorage.removeItem("user_profile");
        // Redirect to login after a brief moment to ensure UX is smooth
        const timer = setTimeout(() => {
            router.replace("/login");
        }, 1000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans p-4">
            <div className="text-center space-y-4 max-w-sm">
                {/* Visual indicator */}
                <div className="relative mx-auto w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-lg">
                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                </div>
                <div className="space-y-1.5">
                    <h2 className="text-lg font-black text-white tracking-tight">Cerrando sesión</h2>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        Espera un momento mientras limpiamos tus datos de sesión de forma segura.
                    </p>
                </div>
            </div>
        </div>
    );
}
