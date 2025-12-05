'use client';

import Link from 'next/link';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/components/shared/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, LayoutDashboard, Map, MapPin, Edit3, Bus } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-600">로딩 중...</div>;
    if (!user) return null;

    const navItems = [
        { href: '/admin/dashboard', label: '대시보드', icon: LayoutDashboard },
        { href: '/admin/routes', label: '노선 관리', icon: Bus },
        { href: '/admin/stops', label: '정류장 관리', icon: MapPin },
        { href: '/admin/editor', label: '노선도 편집', icon: Edit3 },
    ];

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-blue-600">
                        <Map className="w-8 h-8" />
                        <h1 className="text-xl font-bold tracking-tight">Lao Bus</h1>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 truncate">{user.email}</p>
                </div>

                <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={signOut}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={18} /> 로그아웃
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-50">
                <div className="max-w-7xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
