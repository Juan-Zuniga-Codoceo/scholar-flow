import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                "sf-navy":       "#1E3A5F",
                "sf-blue":       "#264B8A",
                "sf-teal":       "#2A9D8F",
                "sf-teal-light": "#48B8AA",
                "sf-green":      "#52B788",
                "sf-green-light":"#80C9A4",
                "sf-bg":         "#F5F7FA",
                "sf-surface":    "#FFFFFF",
                "sf-border":     "#E2E8F0",
                "sf-muted":      "#94A3B8",
            },
            backgroundImage: {
                "sf-gradient":       "linear-gradient(135deg, #1E3A5F 0%, #264B8A 40%, #2A9D8F 100%)",
                "sf-gradient-light": "linear-gradient(135deg, #264B8A 0%, #2A9D8F 100%)",
                "sf-gradient-green": "linear-gradient(135deg, #2A9D8F 0%, #52B788 100%)",
            },
            fontFamily: {
                sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
            },
            boxShadow: {
                "sf-navy": "0 4px 24px rgba(30, 58, 95, 0.25)",
                "sf-teal": "0 4px 24px rgba(42, 157, 143, 0.30)",
            },
            animation: {
                "sf-fade": "sf-fade-in 0.3s ease-out forwards",
                "sf-pulse": "sf-pulse-teal 1.8s ease-in-out infinite",
            },
        },
    },
    plugins: [],
};
export default config;
