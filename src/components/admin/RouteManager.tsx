'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Route } from '@/lib/supabase/types';
import { Trash2, Edit, Plus } from 'lucide-react';

export default function RouteManager() {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<Route | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        route_number: '',
        route_name: '',
        route_color: '#3B82F6',
        description: '',
        is_active: true
    });

    useEffect(() => {
        fetchRoutes();
    }, []);

    const fetchRoutes = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('routes')
                .select('*')
                .order('route_number');

            if (error) throw error;
            setRoutes(data || []);
        } catch (error) {
            console.error('Error fetching routes:', error);
            alert('노선 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRoute) {
                const { error } = await supabase
                    .from('routes')
                    .update(formData)
                    .eq('id', editingRoute.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('routes')
                    .insert([formData]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            resetForm();
            fetchRoutes();
        } catch (error) {
            console.error('Error saving route:', error);
            alert('노선 저장에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('정말 이 노선을 삭제하시겠습니까?')) return;

        try {
            const { error } = await supabase
                .from('routes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchRoutes();
        } catch (error) {
            console.error('Error deleting route:', error);
            alert('노선 삭제에 실패했습니다.');
        }
    };

    const openEditModal = (route: Route) => {
        setEditingRoute(route);
        setFormData({
            route_number: route.route_number,
            route_name: route.route_name,
            route_color: route.route_color,
            description: route.description || '',
            is_active: route.is_active
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingRoute(null);
        setFormData({
            route_number: '',
            route_name: '',
            route_color: '#3B82F6',
            description: '',
            is_active: true
        });
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">노선 목록</h3>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    <Plus size={20} /> 새 노선 추가
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">로딩 중...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="p-3">번호</th>
                                <th className="p-3">이름</th>
                                <th className="p-3">색상</th>
                                <th className="p-3">상태</th>
                                <th className="p-3">설명</th>
                                <th className="p-3 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {routes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        등록된 노선이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                routes.map((route) => (
                                    <tr key={route.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium">{route.route_number}</td>
                                        <td className="p-3">{route.route_name}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded-full border"
                                                    style={{ backgroundColor: route.route_color }}
                                                />
                                                <span className="text-sm text-gray-500">{route.route_color}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs ${route.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {route.is_active ? '운행중' : '중단'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-500 truncate max-w-xs">{route.description}</td>
                                        <td className="p-3 text-right space-x-2">
                                            <button
                                                onClick={() => openEditModal(route)}
                                                className="text-gray-600 hover:text-blue-600"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(route.id)}
                                                className="text-gray-600 hover:text-red-600"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">
                            {editingRoute ? '노선 수정' : '새 노선 추가'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">노선 번호</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.route_number}
                                    onChange={(e) => setFormData({ ...formData, route_number: e.target.value })}
                                    className="w-full border rounded p-2"
                                    placeholder="예: 1, 2A"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">노선 이름</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.route_name}
                                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                                    className="w-full border rounded p-2"
                                    placeholder="예: 탓루앙 순환선"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">노선 색상</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={formData.route_color}
                                        onChange={(e) => setFormData({ ...formData, route_color: e.target.value })}
                                        className="h-10 w-20 p-1 border rounded"
                                    />
                                    <input
                                        type="text"
                                        value={formData.route_color}
                                        onChange={(e) => setFormData({ ...formData, route_color: e.target.value })}
                                        className="flex-1 border rounded p-2 uppercase"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border rounded p-2 h-20"
                                    placeholder="노선에 대한 설명..."
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <label htmlFor="is_active" className="text-sm text-gray-700">운행 중</label>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
