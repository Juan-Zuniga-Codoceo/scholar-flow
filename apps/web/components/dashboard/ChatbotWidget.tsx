"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, PhoneCall, CheckCircle } from "lucide-react";
import { getToken } from "@/lib/auth";

interface Message {
    text: string;
    sender: "ia" | "user";
    success?: boolean;
    judge?: {
        score: number;
        reason: string;
    };
}

export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    text: "¡Hola! Soy el Asistente Técnico Oficial de Scholar-Flow. 🤖\n\n¿En qué puedo ayudarte hoy? Puedes consultarme sobre la malla horaria, licencias médicas, la recomendación de suplentes, o el estado demo gratuito.",
                    sender: "ia",
                    success: true
                }
            ]);
        }
    }, [messages.length]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const queryText = inputValue.trim();
        if (!queryText || loading) return;

        // Add user message
        setMessages((prev) => [...prev, { text: queryText, sender: "user" }]);
        setInputValue("");
        setLoading(true);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const token = getToken();
            const response = await fetch(`${API_URL}/api/knowledge/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ question: queryText }),
            });

            if (!response.ok) {
                throw new Error("Error de conexión");
            }

            const data = await response.json();

            setMessages((prev) => [
                ...prev,
                {
                    text: data.answer,
                    sender: "ia",
                    success: data.success,
                    judge: data.judge,
                },
            ]);
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages((prev) => [
                ...prev,
                {
                    text: "Lamentamos los inconvenientes. Hubo un error de conexión con nuestros servidores de soporte. Por favor, intenta de nuevo o comunícate directamente con nuestro equipo técnico.",
                    sender: "ia",
                    success: false,
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const contactHumanSupport = () => {
        window.open("https://wa.me/56940413646", "_blank");
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans">
            {/* Launcher button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative w-14 h-14 rounded-full bg-sf-gradient-light hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all duration-300 z-50 cursor-pointer ${
                    isOpen ? "rotate-90 bg-slate-700" : ""
                }`}
                title="Soporte Inteligente Scholar-Flow"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-sf-teal opacity-75 animate-ping -z-10"></span>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-18 right-0 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[80vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-sf-fade">
                    {/* Header */}
                    <div className="bg-sf-gradient p-4 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg shadow-inner">
                                🤖
                            </div>
                            <div>
                                <h4 className="text-xs font-bold tracking-tight">Soporte Inteligente</h4>
                                <span className="text-[10px] text-white/75 flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    En línea (IA RAG)
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Chat Body */}
                    <div
                        ref={chatBodyRef}
                        className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 scroll-smooth"
                    >
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex flex-col ${
                                    msg.sender === "user" ? "items-end" : "items-start"
                                }`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                                        msg.sender === "user"
                                            ? "bg-sf-teal text-white rounded-tr-none font-medium"
                                            : msg.success === false
                                            ? "bg-red-50 border border-red-100 text-red-950 rounded-tl-none"
                                            : "bg-white border border-slate-100 text-sf-navy rounded-tl-none"
                                    }`}
                                >
                                    <p className="whitespace-pre-line">{msg.text}</p>

                                    {/* Judge Verification Badge */}
                                    {msg.sender === "ia" && msg.success && msg.judge && (
                                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1 text-[9px] text-emerald-600 font-semibold">
                                            <CheckCircle className="w-3 h-3 text-emerald-500 fill-emerald-50" />
                                            <span>
                                                Resp. oficial ({Math.round(msg.judge.score * 100)}% fidelidad)
                                            </span>
                                        </div>
                                    )}

                                    {/* Call to action if verification fails */}
                                    {msg.sender === "ia" && msg.success === false && (
                                        <div className="mt-3 pt-2.5 border-t border-red-200/50 flex flex-col gap-2">
                                            <button
                                                onClick={contactHumanSupport}
                                                className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all duration-200 cursor-pointer"
                                            >
                                                <PhoneCall className="w-3.5 h-3.5" />
                                                Contactar Soporte WhatsApp
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Loading Indicator */}
                        {loading && (
                            <div className="flex flex-col items-start">
                                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-semibold tracking-wide flex items-center gap-1">
                                        🤖 Validando respuesta...
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input form */}
                    <form
                        onSubmit={handleSendMessage}
                        className="p-3 border-t border-slate-100 bg-white flex items-center gap-2"
                    >
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Escribe tu duda sobre Scholar-Flow..."
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:bg-white focus:border-sf-teal/50 focus:ring-2 focus:ring-sf-teal/10 disabled:opacity-50 transition-all font-medium placeholder-slate-400 text-slate-900"
                        />
                        <button
                            type="submit"
                            disabled={loading || !inputValue.trim()}
                            className="p-2.5 rounded-xl bg-sf-gradient-light hover:shadow-lg disabled:opacity-50 disabled:shadow-none hover:scale-105 active:scale-95 text-white transition-all cursor-pointer"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
