'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Route, Stop, RouteStop } from '@/lib/supabase/types';
import { Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';

type RouteStopWithDetail = RouteStop & {
    stops: Stop;
};

export default function RouteStopEditor() {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState<string>('');
    const [routeStops, setRouteStops] = useState<RouteStopWithDetail[]>([]);
    const [allStops, setAllStops] = useState<Stop[]>([]);
    const [loading, setLoading] = useState(false);
    const [addingStopId, setAddingStopId] = useState<string>('');

    useEffect(() => {
        fetchRoutes();
        fetchAllStops();
    }, []);

    useEffect(() => {
        if (selectedRouteId) {
            fetchRouteStops(selectedRouteId);
        } else {
            setRouteStops([]);
        }
    }, [selectedRouteId]);

    const fetchRoutes = async () => {
        const { data } = await supabase.from('routes').select('*').order('route_number');
        setRoutes(data || []);
    };

    const fetchAllStops = async () => {
        const { data } = await supabase.from('stops').select('*').order('stop_name');
        setAllStops(data || []);
    };

    const fetchRouteStops = async (routeId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('route_stops')
            .select('*, stops(*)')
            .eq('route_id', routeId)
            .order('sequence_order');

        if (error) {
            console.error('Error fetching route stops:', error);
        } else {
            // @ts-ignore - Supabase types join issue
            setRouteStops(data || []);
        }
        setLoading(false);
    };

    const handleAddStop = async () => {
        if (!selectedRouteId || !addingStopId) return;

        const newSequence = routeStops.length + 1;

        const { error } = await supabase
            .from('route_stops')
            .insert({
                route_id: selectedRouteId,
                stop_id: addingStopId,
                sequence_order: newSequence,
                direction: 'outbound' // Default for MVP
            });

        if (error) {
            alert('정류장 추가 실패');
        } else {
            fetchRouteStops(selectedRouteId);
            setAddingStopId('');
        }
    };

    const handleRemoveStop = async (id: string) => {
        const { error } = await supabase.from('route_stops').delete().eq('id', id);
        if (!error) fetchRouteStops(selectedRouteId);
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === routeStops.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        const itemA = routeStops[index];
        const itemB = routeStops[targetIndex];

        // Swap sequence_order
        await supabase.from('route_stops').update({ sequence_order: itemB.sequence_order }).eq('id', itemA.id);
        await supabase.from('route_stops').update({ sequence_order: itemA.sequence_order }).eq('id', itemB.id);

        fetchRouteStops(selectedRouteId);
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">노선 선택</label>
                <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="w-full border rounded p-2"
                >
                    <option value="">노선을 선택하세요</option>
                    {routes.map(route => (
                        <option key={route.id} value={route.id}>
                            {route.route_number}번 - {route.route_name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedRouteId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Current Stops */}
                    <div>
                        <h3 className="font-semibold mb-4">현재 정류장 순서</h3>
                        {loading ? (
                            <div>로딩 중...</div>
                        ) : (
                            <div className="space-y-2">
                                {routeStops.length === 0 ? (
                                    <div className="text-gray-500 text-sm">등록된 정류장이 없습니다.</div>
                                ) : (
                                    routeStops.map((rs, index) => (
                                        <div key={rs.id} className="flex items-center justify-between border p-3 rounded bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                                                    {index + 1}
                                                </span>
                                                <span>{rs.stops?.stop_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleMove(index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                                                >
                                                    <ArrowUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleMove(index, 'down')}
                                                    disabled={index === routeStops.length - 1}
                                                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                                                >
                                                    <ArrowDown size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveStop(rs.id)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Add Stop */}
                    <div>
                        <h3 className="font-semibold mb-4">정류장 추가</h3>
                        <div className="flex gap-2">
                            <select
                                value={addingStopId}
                                onChange={(e) => setAddingStopId(e.target.value)}
                                className="flex-1 border rounded p-2"
                            >
                                <option value="">정류장 선택...</option>
                                {allStops.map(stop => (
                                    <option key={stop.id} value={stop.id}>
                                        {stop.stop_name} ({stop.stop_name_en})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddStop}
                                disabled={!addingStopId}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            * 목록에서 정류장을 선택하여 순서대로 추가하세요.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
