import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

export const metadata: Metadata = {
    title: {
        default: "Scholar Flow — Inteligencia en Administración Escolar",
        template: "%s | Scholar Flow",
    },
    description: "Plataforma SaaS de gestión educativa con IA. Administra horarios, profesores, licencias y más desde un solo lugar.",
    keywords: ["gestión escolar", "educación", "horarios", "profesores", "SaaS educativo", "Chile"],
    authors: [{ name: "Scholar Flow" }],
    icons: {
        icon: [
            { url: "/logo.png", type: "image/png" },
        ],
        apple: "/logo.png",
        shortcut: "/logo.png",
    },
    openGraph: {
        title: "Scholar Flow — Inteligencia en Administración Escolar",
        description: "Plataforma SaaS de gestión educativa con IA para instituciones chilenas.",
        images: ["/logo-full.png"],
        locale: "es_CL",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" suppressHydrationWarning className={inter.variable}>
            <body className={`antialiased font-sans bg-sf-bg text-sf-navy ${inter.className}`}>
                {children}
            </body>
        </html>
    );
}
