'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Route, RouteGroup } from '@/lib/supabase/types';
import { Trash2, Edit, Plus, Settings } from 'lucide-react';
import RouteGroupManager from './RouteGroupManager';

export default function RouteManager() {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [routeGroups, setRouteGroups] = useState<RouteGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<Route | null>(null);

    const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

    // Form state
    const [formData, setFormData] = useState({
        route_number: '',
        route_name: '',
        group_id: '',
        route_color: '#3B82F6',
        description: '',
        is_active: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchRouteGroups(), fetchRoutes()]);
        setLoading(false);
    };

    const fetchRouteGroups = async () => {
        const { data } = await supabase.from('route_groups').select('*').order('sort_order');
        if (data) {
            setRouteGroups(data);
            // Set default group_id for form if groups exist
            if (data.length > 0 && !formData.group_id) {
                setFormData(prev => ({ ...prev, group_id: data[0].id }));
            }
        }
    };

    const fetchRoutes = async () => {
        try {
            const { data, error } = await supabase
                .from('routes')
                .select('*')
                .order('route_number');

            if (error) throw error;
            setRoutes(data || []);
        } catch (error) {
            console.error('Error fetching routes:', error);
            alert('노선 목록을 불러오는데 실패했습니다.');
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
            group_id: route.group_id || (routeGroups.length > 0 ? routeGroups[0].id : ''),
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
            group_id: routeGroups.length > 0 ? routeGroups[0].id : '',
            route_color: '#3B82F6',
            description: '',
            is_active: true
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">노선 목록</h3>
                    <p className="text-sm text-slate-500 mt-1">등록된 버스 노선을 관리합니다.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsGroupManagerOpen(true)}
                        className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm min-h-[44px]"
                        title="노선 그룹 관리"
                    >
                        <Settings size={18} />
                    </button>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm min-h-[44px]"
                    >
                        <Plus size={18} /> 새 노선 추가
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-6 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setSelectedGroupId('all')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${selectedGroupId === 'all'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                >
                    전체
                </button>
                {routeGroups.map((group) => (
                    <button
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${selectedGroupId === group.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        {group.name}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">데이터를 불러오는 중입니다...</div>
            ) : (
                <>
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                    <th className="px-6 py-4">번호</th>
                                    <th className="px-6 py-4">이름</th>
                                    <th className="px-6 py-4">색상</th>
                                    <th className="px-6 py-4">상태</th>
                                    <th className="px-6 py-4">설명</th>
                                    <th className="px-6 py-4 text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {routes.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            등록된 노선이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    routes
                                        .filter(r => selectedGroupId === 'all' || r.group_id === selectedGroupId)
                                        .map((route) => (
                                            <tr
                                                key={route.id}
                                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                                                onClick={() => openEditModal(route)}
                                            >
                                                <td className="px-6 py-4 font-semibold text-slate-900">{route.route_number}</td>
                                                <td className="px-6 py-4 text-slate-700">{route.route_name}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-6 h-6 rounded-full shadow-sm border border-slate-200"
                                                            style={{ backgroundColor: route.route_color }}
                                                        />
                                                        {/* <span className="text-sm text-slate-500 font-mono">{route.route_color}</span> */}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${route.is_active
                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}>
                                                        {route.is_active ? '운행중' : '중단'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 truncate max-w-xs text-sm">{route.description}</td>
                                                <td className="px-6 py-4 text-right space-x-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(route.id);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="삭제"
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

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4 p-4">
                        {routes.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                                등록된 노선이 없습니다.
                            </div>
                        ) : (
                            routes
                                .filter(r => selectedGroupId === 'all' || r.group_id === selectedGroupId)
                                .map((route) => (
                                    <div key={route.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-slate-900">{route.route_number}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${route.is_active
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                    {route.is_active ? '운행중' : '중단'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded-full border border-slate-200 shadow-sm"
                                                    style={{ backgroundColor: route.route_color }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-slate-800">{route.route_name}</h4>
                                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{route.description}</p>
                                        </div>

                                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                                            <button
                                                onClick={() => openEditModal(route)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors min-h-[44px]"
                                            >
                                                <Edit size={16} /> 수정
                                            </button>
                                            <button
                                                onClick={() => handleDelete(route.id)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors min-h-[44px]"
                                            >
                                                <Trash2 size={16} /> 삭제
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
                    <div className="bg-white w-full h-full md:h-auto md:max-w-md md:rounded-xl shadow-2xl p-6 md:p-8 overflow-y-auto border-none md:border border-slate-200">
                        <h3 className="text-xl font-bold mb-6 text-slate-800">
                            {editingRoute ? '노선 수정' : '새 노선 추가'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">노선 번호</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.route_number}
                                    onChange={(e) => setFormData({ ...formData, route_number: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="예: 1, 2A"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">노선 이름</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.route_name}
                                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="예: 탓루앙 순환선"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">노선 유형</label>
                                <select
                                    value={formData.group_id}
                                    onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white"
                                >
                                    {routeGroups.map(group => (
                                        <option key={group.id} value={group.id}>{group.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">노선 색상</label>
                                <div className="flex gap-3">
                                    <input
                                        type="color"
                                        value={formData.route_color}
                                        onChange={(e) => setFormData({ ...formData, route_color: e.target.value })}
                                        className="h-11 w-20 p-1 border border-slate-300 rounded-lg cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={formData.route_color}
                                        onChange={(e) => setFormData({ ...formData, route_color: e.target.value })}
                                        className="flex-1 border border-slate-300 rounded-lg p-2.5 uppercase font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">설명</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                    placeholder="노선에 대한 설명..."
                                />
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-slate-700 cursor-pointer select-none">현재 운행 중인 노선입니다</label>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 sticky bottom-0 bg-white pb-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors min-h-[44px]"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors min-h-[44px]"
                                >
                                    저장하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Route Group Manager Modal */}
            <RouteGroupManager
                isOpen={isGroupManagerOpen}
                onClose={() => setIsGroupManagerOpen(false)}
                onUpdate={() => {
                    fetchRouteGroups();
                    fetchRoutes(); // Refresh routes in case group names changed (though we use IDs, UI might need refresh if we displayed names)
                }}
            />
        </div>
    );
}
