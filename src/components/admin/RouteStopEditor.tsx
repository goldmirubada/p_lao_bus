'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Route, Stop, RouteStop } from '@/lib/supabase/types';
import { Trash2, ArrowUp, ArrowDown, Plus, Map as MapIcon } from 'lucide-react';
import PathEditorModal from './PathEditorModal';
import RouteMap from '../user/RouteMap';
import GoogleMapsWrapper from './GoogleMapsWrapper';

type RouteStopWithDetail = RouteStop & {
    stops: Stop;
    path_coordinates?: { lat: number; lng: number }[];
};

export default function RouteStopEditor() {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [selectedRouteId, setSelectedRouteId] = useState<string>('');
    const [routeStops, setRouteStops] = useState<RouteStopWithDetail[]>([]);
    const [allStops, setAllStops] = useState<Stop[]>([]);
    const [loading, setLoading] = useState(false);
    const [addingStopId, setAddingStopId] = useState<string>('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Path Editing State
    const [editingPathIndex, setEditingPathIndex] = useState<number | null>(null);

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
            setRouteStops([]);
        } else {
            // Fetch coordinates for each stop using RPC to ensure we have valid lat/lng
            // This is required because RouteMap expects GeoJSON format or explicit coordinates
            const stopsWithCoords = await Promise.all(
                (data || []).map(async (rs: any) => {
                    const { data: coordData } = await supabase
                        .rpc('get_stop_coordinates', { stop_id: rs.stops.id });

                    if (coordData && coordData.length > 0) {
                        // Add GeoJSON-formatted location which RouteMap expects
                        rs.stops.location = {
                            type: 'Point',
                            coordinates: [coordData[0].lng, coordData[0].lat]
                        };
                        // Also add flat lat/lng for other uses if needed
                        rs.stops.lat = coordData[0].lat;
                        rs.stops.lng = coordData[0].lng;
                    }
                    return rs;
                })
            );

            // @ts-ignore - Supabase types join issue
            setRouteStops(stopsWithCoords);
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

        // Get ordered route_stop IDs (Primary Keys)
        const orderedRouteStopIds = newStops.map(rs => rs.id);

        // Call RPC to reorder safely
        const { error } = await supabase.rpc('reorder_route_stops', {
            p_route_id: selectedRouteId,
            p_route_stop_ids: orderedRouteStopIds
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

        // Get ordered route_stop IDs (Primary Keys)
        const orderedRouteStopIds = newStops.map(rs => rs.id);

        // Call RPC to reorder safely
        const { error } = await supabase.rpc('reorder_route_stops', {
            p_route_id: selectedRouteId,
            p_route_stop_ids: orderedRouteStopIds
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

    // Save Path Coordinates
    const handleSavePath = async (path: { lat: number; lng: number }[]) => {
        if (editingPathIndex === null) return;

        const stopToUpdate = routeStops[editingPathIndex];

        const { error } = await supabase
            .from('route_stops')
            .update({ path_coordinates: path })
            .eq('id', stopToUpdate.id);

        if (error) {
            console.error('Error saving path:', error);
            alert('경로 저장 실패');
        } else {
            // Update local state
            const newStops = [...routeStops];
            newStops[editingPathIndex] = { ...stopToUpdate, path_coordinates: path };
            setRouteStops(newStops);
            setEditingPathIndex(null);
        }
    };

    // Helper to get coordinates from PostGIS point string if needed, 
    // but here we assume we have lat/lng from the join or separate query if needed.
    // Ideally, the 'stops' join returns the location. 
    // Since 'location' is a geography type, Supabase JS client might return it as GeoJSON or string.
    // For now, let's assume we need to parse it or use a helper.
    // Actually, we created `get_stop_coordinates` RPC but we are fetching via join.
    // Let's use a safe helper to extract lat/lng from the joined stop data.
    // NOTE: The current `stops` table has `location` column. 
    // If Supabase returns it as GeoJSON object: { type: "Point", coordinates: [lng, lat] }

    const getStopCoords = (stop: any) => {
        // This depends on how Supabase returns the geography column.
        // If it returns GeoJSON:
        if (stop.location && stop.location.coordinates) {
            return { lat: stop.location.coordinates[1], lng: stop.location.coordinates[0] };
        }
        // Fallback or if using the RPC view approach in future.
        // For now, let's try to use the `get_stop_coordinates` RPC for the modal if needed, 
        // OR just rely on the fact that we might need to fetch coordinates properly.

        // WAIT: The previous code didn't seem to use coordinates for display in the list.
        // But for the map, we NEED coordinates.
        // Let's assume for now we might need to fetch them or they are available.
        // If `location` is returned as a string (WKB/WKT), we might have an issue.
        // Let's check `GPSMapPicker` usage... it uses lat/lng.
        // Let's try to parse or use a default. 
        // A better approach: When opening the modal, fetch the specific coordinates if missing.

        return { lat: 17.9757, lng: 102.6331 }; // Default fallback
    };

    // We need a way to get actual coordinates for the modal.
    // The `stops` table has `location` column of type geography.
    // Supabase select `stops(*)` typically returns it as a string representation or GeoJSON.
    // To be safe, let's use the RPC `get_stop_coordinates` we created earlier?
    // Or better, let's fetch coordinates when opening the modal to ensure accuracy.

    const openPathEditor = async (index: number) => {
        // We need coordinates for Start (index) and End (index + 1)
        const startStop = routeStops[index];
        const endStop = routeStops[index + 1];

        if (!startStop || !endStop) return;

        // Fetch coordinates for these two stops
        const [startRes, endRes] = await Promise.all([
            supabase.rpc('get_stop_coordinates', { stop_id: startStop.stop_id }),
            supabase.rpc('get_stop_coordinates', { stop_id: endStop.stop_id })
        ]);

        if (startRes.data && startRes.data[0] && endRes.data && endRes.data[0]) {
            // Update local state with fetched coordinates for the modal to use
            // We can store these in a temporary state or just pass them to the modal
            // Let's update the routeStops state with these coords so the modal can read them
            const newStops = [...routeStops];
            newStops[index].stops = { ...newStops[index].stops, lat: startRes.data[0].lat, lng: startRes.data[0].lng } as any;
            newStops[index + 1].stops = { ...newStops[index + 1].stops, lat: endRes.data[0].lat, lng: endRes.data[0].lng } as any;
            setRouteStops(newStops);

            setEditingPathIndex(index);
        } else {
            alert('정류장 좌표를 불러올 수 없습니다.');
        }
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
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 bg-slate-50 p-3 rounded border border-slate-100">
                            💡 목록에서 정류장을 선택하여 순서대로 추가하세요. 왼쪽 목록에서 화살표를 사용해 순서를 변경할 수 있습니다.
                        </p>
                    </div>

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
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-700">{rs.stops?.stop_name}</span>
                                                    {rs.path_coordinates && rs.path_coordinates.length > 0 && (
                                                        <span className="text-[10px] text-blue-600 flex items-center gap-0.5">
                                                            <MapIcon size={10} /> 경로 설정됨
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                {/* Path Edit Button - Only show if not the last stop */}
                                                {index < routeStops.length - 1 && (
                                                    <button
                                                        onClick={() => openPathEditor(index)}
                                                        className="p-2 lg:p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                                                        title="경로 편집"
                                                    >
                                                        <MapIcon size={18} />
                                                    </button>
                                                )}

                                                <div className="w-px h-4 bg-slate-200 mx-1"></div>

                                                <button
                                                    onClick={() => handleMove(index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-2 lg:p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded disabled:opacity-30 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                                                    title="위로 이동"
                                                >
                                                    <ArrowUp size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleMove(index, 'down')}
                                                    disabled={index === routeStops.length - 1}
                                                    className="p-2 lg:p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded disabled:opacity-30 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                                                    title="아래로 이동"
                                                >
                                                    <ArrowDown size={18} />
                                                </button>
                                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                                <button
                                                    onClick={() => handleRemoveStop(rs.id)}
                                                    className="p-2 lg:p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                                                    title="제거"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Route Map Preview */}
            {selectedRouteId && routeStops.length > 0 && routes.find(r => r.id === selectedRouteId) && (
                <div className="mt-8">
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="w-2 h-6 bg-purple-600 rounded-full"></span>
                            노선 미리보기
                        </h3>
                        <RouteMap
                            route={routes.find(r => r.id === selectedRouteId)!}
                            stops={routeStops.map(rs => ({
                                stops: rs.stops,
                                path_coordinates: rs.path_coordinates
                            }))}
                        />
                    </div>
                </div>
            )}

            {/* Path Editor Modal */}
            {editingPathIndex !== null && routeStops[editingPathIndex] && routeStops[editingPathIndex + 1] && (
                <PathEditorModal
                    isOpen={true}
                    onClose={() => setEditingPathIndex(null)}
                    onSave={handleSavePath}
                    startStop={{
                        name: routeStops[editingPathIndex].stops.stop_name,
                        lat: (routeStops[editingPathIndex].stops as any).lat || 0,
                        lng: (routeStops[editingPathIndex].stops as any).lng || 0
                    }}
                    endStop={{
                        name: routeStops[editingPathIndex + 1].stops.stop_name,
                        lat: (routeStops[editingPathIndex + 1].stops as any).lat || 0,
                        lng: (routeStops[editingPathIndex + 1].stops as any).lng || 0
                    }}
                    initialPath={routeStops[editingPathIndex].path_coordinates || []}
                />
            )}
        </div>
    );
}
