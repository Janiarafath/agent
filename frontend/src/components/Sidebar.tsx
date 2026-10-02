"use client";

import { LayoutDashboard, Users, Settings, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Sidebar = () => {
    const { logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const navItems = [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Leads", href: "/leads", icon: Users },
        { name: "Settings", href: "/settings", icon: Settings }
    ];

    return (
        <div className={`relative transition-all duration-300 h-screen bg-white/70 backdrop-blur-xl border-r border-white/40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/40">
                {!isCollapsed && <span className="font-bold text-lg text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">GrowthPilot AI</span>}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors mx-auto"
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 px-3 py-6 flex flex-col gap-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.name} href={item.href}>
                            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive ? 'bg-white shadow-sm border border-slate-100 text-indigo-600' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'}`}>
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : ''}`} />
                                {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}
                            </div>
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/40">
                <button 
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    {!isCollapsed && <span className="font-medium text-sm">Sign out</span>}
                </button>
            </div>
        </div>
    );
}
