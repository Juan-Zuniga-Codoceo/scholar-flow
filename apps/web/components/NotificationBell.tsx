"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Check, CheckSquare, Trash2, Loader2, AlertCircle } from "lucide-react";
import { getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen]               = useState(false);
    const [loading, setLoading]             = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (e) {
            console.error("Error fetching notifications", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleReadAll = async () => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch(`${API}/notifications/read-all`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            }
        } catch (e) {
            console.error("Error reading all notifications", e);
        }
    };

    const handleReadOne = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch(`${API}/notifications/${id}/read`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            }
        } catch (err) {
            console.error("Error marking notification as read", err);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 active:scale-95 rounded-xl transition-all"
                title="Notificaciones"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-3 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">Notificaciones</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleReadAll}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                            >
                                <CheckSquare className="w-3.5 h-3.5" /> Marcar todo leído
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                        {loading && notifications.length === 0 ? (
                            <div className="py-8 flex justify-center">
                                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs italic">
                                Sin notificaciones
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`px-4 py-3 text-xs flex items-start gap-2.5 transition-colors relative group hover:bg-slate-50/50 ${
                                        !n.is_read ? "bg-indigo-50/20" : ""
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-bold ${!n.is_read ? "text-slate-900" : "text-slate-600"}`}>
                                            {n.title}
                                        </p>
                                        <p className="text-slate-500 mt-0.5 leading-relaxed break-words">{n.message}</p>
                                        <p className="text-[9px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleDateString("es-CL", { hour: "2-digit", minute: "2-digit" })}</p>
                                    </div>
                                    {!n.is_read && (
                                        <button
                                            onClick={(e) => handleReadOne(n.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-600 bg-white border border-slate-100 rounded shadow-sm transition-all flex-shrink-0"
                                            title="Marcar como leída"
                                        >
                                            <Check className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
