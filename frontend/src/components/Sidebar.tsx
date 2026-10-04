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
        <div className={`relative transition-all duration-200 h-screen bg-white border-r border-slate-200 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
                {!isCollapsed && (
                    <span className="flex items-center gap-2">
                        <span className="w-7 h-7 bg-indigo-600 rounded-[10px] flex items-center justify-center text-white text-sm font-bold">D</span>
                        <span className="font-bold text-base text-slate-900 tracking-tight">DashWin</span>
                    </span>
                )}
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
                            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors duration-200 ${isActive ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                                <item.icon className="w-5 h-5" />
                                {!isCollapsed && <span className="font-medium text-sm">{item.name}</span>}
                            </div>
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200">
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
                >
                    <LogOut className="w-5 h-5" />
                    {!isCollapsed && <span className="font-medium text-sm">Sign out</span>}
                </button>
            </div>
        </div>
    );
}
