'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Save, Undo, Trash2, HelpCircle } from 'lucide-react';

interface Coordinate {
    lat: number;
    lng: number;
}

interface PathEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (path: Coordinate[]) => void;
    startStop: { name: string; lat: number; lng: number };
    endStop: { name: string; lat: number; lng: number };
    initialPath?: Coordinate[];
}

export default function PathEditorModal({
    isOpen,
    onClose,
    onSave,
    startStop,
    endStop,
    initialPath = []
}: PathEditorModalProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [path, setPath] = useState<Coordinate[]>(initialPath);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const polylineRef = useRef<google.maps.Polyline | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setPath(initialPath);
        }
    }, [isOpen, initialPath]);

    // Initialize Map
    useEffect(() => {
        const initMap = async () => {
            if (!isOpen || !mapRef.current || !window.google) return;

            const { Map } = await google.maps.importLibrary("maps") as any;
            const { LatLngBounds } = await google.maps.importLibrary("core") as any;

            const bounds = new LatLngBounds();
            bounds.extend({ lat: startStop.lat, lng: startStop.lng });
            bounds.extend({ lat: endStop.lat, lng: endStop.lng });

            // Add initial path points to bounds
            initialPath.forEach(p => bounds.extend(p));

            const newMap = new Map(mapRef.current, {
                center: bounds.getCenter(),
                zoom: 14,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                clickableIcons: false, // Prevent clicking POIs
            });

            newMap.fitBounds(bounds);

            // Add padding to bounds
            const listener = google.maps.event.addListener(newMap, "idle", () => {
                // newMap.setZoom(newMap.getZoom()! - 1); 
                google.maps.event.removeListener(listener);
            });

            setMap(newMap);

            // Map click listener to add points
            newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
                if (!e.latLng) return;
                const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                setPath(prev => [...prev, newPoint]);
            });
        };
        initMap();

    }, [isOpen, mapRef]); // Re-init map when modal opens

    // Draw Map Elements (Markers & Polyline)
    useEffect(() => {
        const drawElements = async () => {
            if (!map || !window.google) return;

            const { Marker } = await google.maps.importLibrary("marker") as any;
            const { Polyline } = await google.maps.importLibrary("maps") as any;

            // Clear existing markers
            markersRef.current.forEach(m => m.setMap(null));
            markersRef.current = [];

            // Clear existing polyline
            if (polylineRef.current) {
                polylineRef.current.setMap(null);
            }

            // 1. Draw Start Marker (Blue)
            new Marker({
                position: { lat: startStop.lat, lng: startStop.lng },
                map: map,
                label: { text: "A", color: "white", fontWeight: "bold" },
                title: `출발: ${startStop.name}`,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#2563EB', // Blue-600
                    fillOpacity: 1,
                    strokeColor: 'white',
                    strokeWeight: 2,
                }
            });

            // 2. Draw End Marker (Red)
            new Marker({
                position: { lat: endStop.lat, lng: endStop.lng },
                map: map,
                label: { text: "B", color: "white", fontWeight: "bold" },
                title: `도착: ${endStop.name}`,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#DC2626', // Red-600
                    fillOpacity: 1,
                    strokeColor: 'white',
                    strokeWeight: 2,
                }
            });

            // 3. Draw Waypoint Markers (Draggable)
            path.forEach((point, index) => {
                const marker = new Marker({
                    position: point,
                    map: map,
                    draggable: true,
                    title: `경유지 ${index + 1} (우클릭하여 삭제)`,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 6,
                        fillColor: '#F59E0B', // Amber-500
                        fillOpacity: 1,
                        strokeColor: 'white',
                        strokeWeight: 2,
                    }
                });

                // Drag event
                marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
                    if (e.latLng) {
                        const newPath = [...path];
                        newPath[index] = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                        setPath(newPath);
                    }
                });

                // Right click to delete
                marker.addListener('rightclick', () => {
                    setPath(prev => prev.filter((_, i) => i !== index));
                });

                markersRef.current.push(marker);
            });

            // 4. Draw Polyline
            const pathCoordinates = [
                { lat: startStop.lat, lng: startStop.lng },
                ...path,
                { lat: endStop.lat, lng: endStop.lng }
            ];

            polylineRef.current = new Polyline({
                path: pathCoordinates,
                geodesic: true,
                strokeColor: '#2563EB',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                map: map,
                icons: [{
                    icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                    offset: '100%',
                    repeat: '100px'
                }]
            });
        };
        drawElements();

    }, [map, path, startStop, endStop]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            경로 상세 편집
                            <span className="text-xs font-normal px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                                {path.length}개의 경유지
                            </span>
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <span className="font-medium text-blue-600">{startStop.name}</span>
                            <span className="text-slate-300">➔</span>
                            <span className="font-medium text-red-600">{endStop.name}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Map Area */}
                <div className="flex-1 relative bg-slate-50">
                    <div ref={mapRef} className="w-full h-full" />

                    {/* Floating Helper */}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-3 rounded-xl shadow-lg border border-slate-200 text-sm text-slate-600 max-w-xs">
                        <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <HelpCircle size={16} className="text-blue-500" /> 편집 방법
                        </h4>
                        <ul className="space-y-1.5 list-disc list-inside text-xs">
                            <li><span className="font-semibold text-slate-800">클릭:</span> 지도 빈 곳을 눌러 경유지 추가</li>
                            <li><span className="font-semibold text-slate-800">드래그:</span> 주황색 점을 끌어서 위치 이동</li>
                            <li><span className="font-semibold text-slate-800">우클릭:</span> 주황색 점을 눌러서 삭제</li>
                        </ul>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
                    <button
                        onClick={() => setPath([])}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
                        title="모든 경유지 삭제"
                    >
                        <Trash2 size={18} />
                        초기화
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl font-medium transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => onSave(path)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                        >
                            <Save size={18} />
                            경로 저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
