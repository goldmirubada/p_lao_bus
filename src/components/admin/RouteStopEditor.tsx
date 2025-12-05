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
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

        // Create new order array by swapping
        const newStops = [...routeStops];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newStops[index], newStops[targetIndex]] = [newStops[targetIndex], newStops[index]];

        // Get ordered stop IDs
        const orderedStopIds = newStops.map(rs => rs.stop_id);

        // Call RPC to reorder safely
        const { error } = await supabase.rpc('reorder_route_stops', {
            p_route_id: selectedRouteId,
            p_stop_ids: orderedStopIds
        });

        if (error) {
            console.error('Reorder error:', error);
            alert('정류장 순서 변경 중 오류가 발생했습니다.');
        } else {
            fetchRouteStops(selectedRouteId);
        }
    };

    // Drag and Drop handlers
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        // Reorder the stops array
        const newStops = [...routeStops];
        const [draggedItem] = newStops.splice(draggedIndex, 1);
        newStops.splice(dropIndex, 0, draggedItem);

        // Get ordered stop IDs
        const orderedStopIds = newStops.map(rs => rs.stop_id);

        // Call RPC to reorder safely
        const { error } = await supabase.rpc('reorder_route_stops', {
            p_route_id: selectedRouteId,
            p_stop_ids: orderedStopIds
        });

        setDraggedIndex(null);

        if (error) {
            console.error('Reorder error:', error);
            alert('정류장 순서 변경 중 오류가 발생했습니다.');
        }

        fetchRouteStops(selectedRouteId);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-2">편집할 노선 선택</label>
                <div className="relative">
                    <select
                        value={selectedRouteId}
                        onChange={(e) => setSelectedRouteId(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-3 pr-10 appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium"
                    >
                        <option value="">노선을 선택하세요</option>
                        {routes.map(route => (
                            <option key={route.id} value={route.id}>
                                {route.route_number}번 - {route.route_name}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                </div>
            </div>

            {selectedRouteId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Current Stops */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                            현재 정류장 순서
                        </h3>
                        {loading ? (
                            <div className="text-center py-8 text-slate-500">로딩 중...</div>
                        ) : (
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                {routeStops.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300 text-slate-500">
                                        등록된 정류장이 없습니다.<br />오른쪽에서 정류장을 추가해주세요.
                                    </div>
                                ) : (
                                    routeStops.map((rs, index) => (
                                        <div
                                            key={rs.id}
                                            draggable
                                            onDragStart={() => handleDragStart(index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDrop={(e) => handleDrop(e, index)}
                                            onDragEnd={handleDragEnd}
                                            className={`flex items-center justify-between border border-slate-200 p-3 rounded-lg bg-white shadow-sm hover:border-blue-300 transition-all group cursor-move ${draggedIndex === index ? 'opacity-50' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                                                    {index + 1}
                                                </span>
                                                <span className="font-medium text-slate-700">{rs.stops?.stop_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleMove(index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded disabled:opacity-30 transition-colors"
                                                    title="위로 이동"
                                                >
                                                    <ArrowUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleMove(index, 'down')}
                                                    disabled={index === routeStops.length - 1}
                                                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded disabled:opacity-30 transition-colors"
                                                    title="아래로 이동"
                                                >
                                                    <ArrowDown size={16} />
                                                </button>
                                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                                <button
                                                    onClick={() => handleRemoveStop(rs.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="제거"
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
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-fit">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-2 h-6 bg-green-500 rounded-full"></span>
                            정류장 추가
                        </h3>
                        <div className="flex gap-2 mb-2">
                            <div className="relative flex-1">
                                <select
                                    value={addingStopId}
                                    onChange={(e) => setAddingStopId(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 pr-8 appearance-none focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all text-slate-700"
                                >
                                    <option value="">정류장 선택...</option>
                                    {allStops.map(stop => (
                                        <option key={stop.id} value={stop.id}>
                                            {stop.stop_name} ({stop.stop_name_en})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                                </div>
                            </div>
                            <button
                                onClick={handleAddStop}
                                disabled={!addingStopId}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 bg-slate-50 p-3 rounded border border-slate-100">
                            💡 목록에서 정류장을 선택하여 순서대로 추가하세요. 왼쪽 목록에서 화살표를 사용해 순서를 변경할 수 있습니다.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
