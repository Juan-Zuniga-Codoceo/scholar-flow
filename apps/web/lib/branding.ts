import { getToken } from "./auth";

export interface OrganizationBranding {
    id: string;
    name: string;
    subdomain: string;
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
}

export async function fetchBranding(): Promise<OrganizationBranding | null> {
    try {
        const token = getToken();
        if (!token) return null;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API_URL}/api/organization`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.error("Error fetching branding:", e);
    }
    return null;
}

export function applyBranding(branding: OrganizationBranding | null) {
    if (!branding) {
        // Reset to default Scholar Flow colors
        document.documentElement.style.removeProperty('--sf-teal');
        document.documentElement.style.removeProperty('--sf-teal-light');
        document.documentElement.style.removeProperty('--sf-navy');
        document.documentElement.style.removeProperty('--sf-blue');
        return;
    }

    if (branding.primary_color) {
        document.documentElement.style.setProperty('--sf-teal', branding.primary_color);
        // Semi-transparent hover/focus color
        document.documentElement.style.setProperty('--sf-teal-light', branding.primary_color + "cc");
    } else {
        document.documentElement.style.removeProperty('--sf-teal');
        document.documentElement.style.removeProperty('--sf-teal-light');
    }

    if (branding.secondary_color) {
        document.documentElement.style.setProperty('--sf-navy', branding.secondary_color);
        document.documentElement.style.setProperty('--sf-blue', branding.secondary_color);
    } else {
        document.documentElement.style.removeProperty('--sf-navy');
        document.documentElement.style.removeProperty('--sf-blue');
    }
}
