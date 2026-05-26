"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
    CreditCard, 
    Users, 
    Calendar, 
    CheckCircle2, 
    AlertTriangle, 
    Clock, 
    ArrowRight, 
    RefreshCw, 
    FileText, 
    ShieldAlert
} from "lucide-react";
import { getToken, getUser, type AuthUser } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface BillingStatus {
    subscription_status: string;
    trial_ends_at: string | null;
    trial_days_left: number | null;
    subscription_ends_at: string | null;
    active_users: number;
    price_per_user: number;
    total_monthly_amount: number;
}

interface PaymentHistoryItem {
    id: string;
    flow_order: string;
    flow_token: string;
    plan: string;
    amount: number;
    status: string;
    paid_at: string | null;
    created_at: string;
}

export default function SuscripcionPage() {
    const router = useRouter();
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [status, setStatus] = useState<BillingStatus | null>(null);
    const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setError(null);
            const token = getToken();
            if (!token) {
                router.replace("/login");
                return;
            }

            // Fetch billing status
            const statusRes = await fetch(`${API_URL}/billing/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!statusRes.ok) {
                throw new Error("No se pudo obtener el estado de facturación.");
            }
            const statusData = await statusRes.json();
            setStatus(statusData);

            // Fetch payment history
            const paymentsRes = await fetch(`${API_URL}/billing/payments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (paymentsRes.ok) {
                const paymentsData = await paymentsRes.json();
                setPayments(paymentsData);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error al cargar la información de facturación.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setAuthUser(getUser());
        loadData();
    }, []);

    const handlePay = async () => {
        if (!status) return;
        try {
            setPaying(true);
            setError(null);
            const token = getToken();
            
            const res = await fetch(`${API_URL}/billing/pay`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({
                    url_return: `${window.location.origin}/dashboard/suscripcion/retorno`
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Error al iniciar el pago.");
            }

            if (data.success && data.payment_url) {
                // Redirect user to Flow Sandbox
                window.location.href = data.payment_url;
            } else {
                throw new Error(data.error || "No se pudo generar la pasarela de pagos.");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Ocurrió un error al contactar a la pasarela.");
            setPaying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium text-sm animate-pulse">Cargando detalles de tu suscripción...</p>
            </div>
        );
    }

    const isAdmin = authUser?.role === "admin";
    const isFree = status?.subscription_status === "free" || status?.subscription_status === "lifetime";
    const isTrial = status?.subscription_status === "trialing";
    const isActive = status?.subscription_status === "active";
    
    // Check if subscription has expired
    const isTrialExpired = isTrial && status?.trial_ends_at && new Date(status.trial_ends_at) < new Date();
    const isActiveExpired = isActive && status?.subscription_ends_at && new Date(status.subscription_ends_at) < new Date();
    const isExpired = !isFree && (isTrialExpired || isActiveExpired || (!isTrial && !isActive));

    const getStatusBadge = () => {
        if (isFree) return <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/25">Demo / Gratuito</span>;
        if (isTrial) {
            if (isTrialExpired) return <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20">Periodo de Prueba Expirado</span>;
            return <span className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20">Periodo de Prueba</span>;
        }
        if (isActive) {
            if (isActiveExpired) return <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20">Suscripción Vencida</span>;
            return <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">Suscripción Activa</span>;
        }
        return <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20">Inactiva / Sin Pago</span>;
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Suscripción y Facturación</h1>
                    <p className="text-slate-500 text-xs mt-1">Administra tu plan SaaS, consulta tarifas dinámicas y mantén al día el acceso de tus profesores.</p>
                </div>
                <button 
                    onClick={loadData}
                    className="flex items-center gap-2 self-start px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all shadow-sm"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Actualizar
                </button>
            </div>

            {error && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-red-700 text-xs font-semibold">
                    <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Lock Warning if Expired */}
            {isExpired && (
                <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base">¡Atención! Tu acceso ha sido bloqueado</h3>
                            <p className="text-white/80 text-xs mt-1 max-w-xl">
                                Tu periodo de prueba o suscripción ha vencido. Para desbloquear la planificación, creación de horarios y control de profesores, debes completar el pago mensual.
                            </p>
                        </div>
                    </div>
                    {isAdmin ? (
                        <button
                            onClick={handlePay}
                            disabled={paying}
                            className="bg-white text-rose-600 hover:bg-slate-50 px-6 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all self-start md:self-auto disabled:opacity-50"
                        >
                            {paying ? "Conectando..." : "Pagar Suscripción"}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <div className="text-xs bg-white/10 px-4 py-2.5 rounded-xl border border-white/20">
                            Ponte en contacto con tu Administrador para renovar el servicio.
                        </div>
                    )}
                </div>
            )}

            {/* Current Plan Card & Dynamic Cost Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Active Membership Status */}
                <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-700 text-sm">Estado del Plan</h3>
                                <p className="text-[10px] text-slate-400 font-semibold">Scholar-Flow SaaS</p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-slate-800">Plan Mensual Dinámico</span>
                            </div>
                            <div className="mt-2">{getStatusBadge()}</div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-6 flex items-center gap-2 text-slate-500 text-xs">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>
                            {isFree 
                                ? "Vence: Gratis para siempre (Demo)"
                                : isTrial 
                                    ? `Termina: ${status?.trial_ends_at ? new Date(status.trial_ends_at).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }) : "—"}`
                                    : `Vence: ${status?.subscription_ends_at ? new Date(status.subscription_ends_at).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }) : "—"}`
                            }
                        </span>
                    </div>
                </div>

                {/* Seat Headcount */}
                <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-700 text-sm">Usuarios Registrados</h3>
                                <p className="text-[10px] text-slate-400 font-semibold">Cupos Ocupados</p>
                            </div>
                        </div>

                        <div className="pt-2">
                            <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{status?.active_users}</span>
                            <span className="text-slate-400 text-xs font-semibold ml-2">usuarios activos</span>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-6 text-slate-500 text-xs flex justify-between items-center">
                        <span>Valor unitario:</span>
                        <span className="font-bold text-slate-700">${status?.price_per_user.toLocaleString("es-CL")} CLP / mes</span>
                    </div>
                </div>

                {/* Total Cost Breakdown & Action */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="space-y-4 z-10">
                        <h3 className="font-semibold text-slate-400 text-xs tracking-wider uppercase">Resumen de Factura</h3>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold">Total Mensual Estimado</p>
                            <p className="text-3xl font-black text-white tracking-tight mt-1">
                                ${status?.total_monthly_amount.toLocaleString("es-CL")} CLP
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Calculado según los usuarios actuales</p>
                        </div>
                    </div>

                    <div className="pt-6 z-10">
                        {isAdmin ? (
                            <button
                                onClick={handlePay}
                                disabled={isFree || paying || (status?.total_monthly_amount || 0) <= 0}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/10"
                            >
                                {isFree ? (
                                    "Plan Gratuito Activo"
                                ) : paying ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Conectando...
                                    </>
                                ) : (
                                    <>
                                        Pagar Membresía
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="text-[10px] text-center text-slate-400 bg-slate-800/50 p-2.5 rounded-xl border border-slate-800">
                                Rol administrativo requerido para renovar pagos.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment History */}
            <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-150 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Historial de Transacciones</h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Registro histórico de pagos realizados a través de Flow.cl</p>
                    </div>
                    <FileText className="w-5 h-5 text-slate-400" />
                </div>

                <div className="overflow-x-auto">
                    {payments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                            <Clock className="w-8 h-8 text-slate-300" />
                            <p className="text-xs font-medium">No se registran transacciones previas en tu organización.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50/75 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="px-6 py-3.5">Código Orden</th>
                                    <th className="px-6 py-3.5">Plan</th>
                                    <th className="px-6 py-3.5">Monto</th>
                                    <th className="px-6 py-3.5">Fecha Creación</th>
                                    <th className="px-6 py-3.5">Fecha Pago</th>
                                    <th className="px-6 py-3.5">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                                {payments.map((p) => {
                                    const isCompleted = p.status === "completed";
                                    const isPending = p.status === "pending";
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-[10px] text-slate-500 font-bold">{p.flow_order}</td>
                                            <td className="px-6 py-4 capitalize">{p.plan === "monthly" ? "Mensual" : p.plan}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-800">${p.amount.toLocaleString("es-CL")} CLP</td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {new Date(p.created_at).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">
                                                {p.paid_at 
                                                    ? new Date(p.paid_at).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) 
                                                    : "—"
                                                }
                                            </td>
                                            <td className="px-6 py-4">
                                                {isCompleted ? (
                                                    <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px] font-bold">Completado</span>
                                                ) : isPending ? (
                                                    <span className="bg-amber-500/10 text-amber-600 border border-amber-500/25 px-2 py-0.5 rounded text-[10px] font-bold">Pendiente</span>
                                                ) : (
                                                    <span className="bg-red-500/10 text-red-500 border border-red-500/25 px-2 py-0.5 rounded text-[10px] font-bold capitalize">{p.status}</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
