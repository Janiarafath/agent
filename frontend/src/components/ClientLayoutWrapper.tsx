"use client";

import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { usePathname } from "next/navigation";

export const ClientLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const inApp = pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/usage" || pathname === "/settings";

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#e4e1f5] border-t-[#2E4BFF] rounded-full animate-spin"></div>
        </div>
    );

    if (!inApp) {
        return <>{children}</>;
    }

    if (!user) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen bg-[#f4f5fa] overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
                {children}
            </div>
        </div>
    );
};
