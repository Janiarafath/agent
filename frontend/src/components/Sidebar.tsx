"use client";

import { LayoutDashboard, Settings, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { DashWinLogo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Sidebar = () => {
    const { logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const navItems = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    return (
      <>
        <div className={`relative transition-all duration-200 h-screen bg-white border-r border-slate-200 hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
                {!isCollapsed && <DashWinLogo />}
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
                            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors duration-200 ${isActive ? 'bg-blue-50 text-[#2E4BFF] font-semibold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
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

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200 flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link key={item.name} href={item.href} className="flex-1">
                        <div className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive ? 'text-[#2E4BFF]' : 'text-slate-400'}`}>
                            <item.icon className="w-5 h-5" />
                            {item.name}
                        </div>
                    </Link>
                )
            })}
            <button onClick={logout} className="flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-slate-400">
                <LogOut className="w-5 h-5" />
                Sign out
            </button>
        </nav>
      </>
    );
}
