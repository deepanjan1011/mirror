"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, Home, FolderOpen, Lightbulb } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MirrorLogo } from "@/components/ui/mirror-logo";

export function Navbar() {
    const pathname = usePathname();
    const { user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Hide navbar on Login, and Signup pages
    // Also hide on Home if user is NOT logged in
    if (['/login', '/signup'].includes(pathname) || (pathname === '/' && !user)) {
        return null;
    }

    const navLinks = [
        { name: "Home", href: "/", icon: Home },
        { name: "Projects", href: "/projects", icon: FolderOpen },
        { name: "Idea", href: "/idea", icon: Lightbulb },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href={user ? "/projects" : "/"} className="flex items-center gap-2 group">
                        <div className="w-7 h-7 transition-transform group-hover:scale-110">
                            <MirrorLogo />
                        </div>
                        <span className="text-lg font-mono text-white">Mirror</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <div className="flex items-center gap-6">
                            {navLinks.map((link) => {
                                const Icon = link.icon;
                                const isActive = pathname === link.href || (link.href !== "/" && link.href !== "/projects" && pathname.startsWith(link.href));

                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={cn(
                                            "flex items-center gap-2 text-sm font-mono transition-colors",
                                            isActive
                                                ? "text-white"
                                                : "text-white/60 hover:text-white"
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {link.name}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="h-6 w-px bg-white/10" />

                        {/* User: link to Settings (logout is on Settings page) */}
                        {user ? (
                            <Link
                                href="/settings"
                                className={cn(
                                    "flex items-center gap-2 text-sm font-mono transition-colors",
                                    pathname === "/settings" ? "text-white" : "text-white/60 hover:text-white"
                                )}
                            >
                                <span className="text-xs max-w-[180px] truncate">
                                    {user.user_metadata?.custom_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                                </span>
                            </Link>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link href="/login">
                                    <Button variant="ghost" size="sm" className="font-mono text-white/80 hover:text-white">
                                        Login
                                    </Button>
                                </Link>
                                <Link href="/signup">
                                    <Button size="sm" className="font-mono bg-white text-black hover:bg-white/90">
                                        Sign Up
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-white/80 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-black border-b border-white/10">
                    <div className="px-6 py-4 space-y-4">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 py-2 text-base font-mono",
                                        isActive ? "text-white" : "text-white/60"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {link.name}
                                </Link>
                            );
                        })}

                        <div className="h-px bg-white/10 my-4" />

                        {user ? (
                            <Link
                                href="/settings"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 py-2 text-base font-mono",
                                    pathname === "/settings" ? "text-white" : "text-white/60"
                                )}
                            >
                                {user.user_metadata?.custom_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                            </Link>
                        ) : (
                            <div className="space-y-2">
                                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start font-mono text-white/80">
                                        Login
                                    </Button>
                                </Link>
                                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button className="w-full font-mono bg-white text-black">
                                        Sign Up
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
