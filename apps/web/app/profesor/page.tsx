"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function ProfesorPage() {
    const router = useRouter();
    useEffect(() => { router.replace("/profesor/perfil"); }, [router]);
    return null;
}
