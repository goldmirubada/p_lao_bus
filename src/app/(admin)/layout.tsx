'use client';

import Link from 'next/link';
import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/components/shared/AuthProvider';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) return <div className="flex h-screen items-center justify-center">로딩 중...</div>;
    if (!user) return null; // Will redirect

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-blue-600">Lao Bus Admin</h1>
                    <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                </div>
                <nav className="p-4 space-y-2 flex-1">
                    <Link href="/admin/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded">
                        대시보드
                    </Link>
                    <Link href="/admin/routes" className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded">
                        노선 관리
                    </Link>
                    <Link href="/admin/stops" className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded">
                        정류장 관리
                    </Link>
                    <Link href="/admin/editor" className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded">
                        노선도 편집
                    </Link>
                </nav>
                <div className="p-4 border-t">
                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded"
                    >
                        <LogOut size={18} /> 로그아웃
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-8">
                {children}
            </main>
        </div>
    );
}
