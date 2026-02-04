import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Synapse Scholar-Flow",
    description: "B2B Educational SaaS",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className="antialiased font-sans bg-gray-50 text-gray-900">
                {children}
            </body>
        </html>
    );
}
