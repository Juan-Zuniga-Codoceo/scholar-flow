// ─────────────────────────────────────────────
//  Scholar-Flow: Auth Utility (client-side)
// ─────────────────────────────────────────────
const TOKEN_KEY = "sf_access_token";
const USER_KEY  = "sf_user";

export interface OrgInfo {
    id: string;
    name: string;
    subdomain: string;
}

export interface AuthUser {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    professor_id?: string | null;
    organization: OrgInfo;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    user: AuthUser;
}

// ── Storage ────────────────────────────────────
export function setSession(data: TokenResponse): void {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
        return null;
    }
}

export function isAuthenticated(): boolean {
    return !!getToken();
}

// ── API Calls ──────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiRegister(payload: {
    org_name: string;
    subdomain: string;
    admin_email: string;
    admin_password: string;
    admin_full_name: string;
}): Promise<TokenResponse> {
    const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Error al registrar");
    return data as TokenResponse;
}

export async function apiLogin(email: string, password: string): Promise<TokenResponse> {
    const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Credenciales inválidas");
    return data as TokenResponse;
}

export async function checkSubdomain(subdomain: string): Promise<{ available: boolean; subdomain: string }> {
    const res = await fetch(`${API}/auth/check-subdomain?subdomain=${encodeURIComponent(subdomain)}`);
    return res.json();
}
