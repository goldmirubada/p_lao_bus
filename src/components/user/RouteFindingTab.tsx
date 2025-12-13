'use client';

import { useState, useMemo } from 'react';
import { X, MapPin, Navigation, Bus, Clock, RefreshCw, RotateCcw } from 'lucide-react';
import { Stop, Route } from '@/lib/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { NetworkGraph } from '@/lib/graph/NetworkGraph';
import { PathResult, RouteError } from '@/lib/graph/types';

interface RouteFindingTabProps {
    userLocation: GeolocationCoordinates | null;
    stops: Stop[];
    graphEngine: NetworkGraph | null;
    onPathFound: (path: PathResult | null) => void;
    onSelectOnMap: (type: 'start' | 'end') => void;
    startPoint: Stop | 'current' | null;
    setStartPoint: (point: Stop | 'current' | null) => void;
    endPoint: Stop | null;
    setEndPoint: (point: Stop | null) => void;
    routes: Route[];
}

export default function RouteFindingTab({
    userLocation,
    stops = [],
    graphEngine,
    onPathFound,
    onSelectOnMap,
    startPoint,
    setStartPoint,
    endPoint,
    setEndPoint,
    routes = []
}: RouteFindingTabProps) {
    const { t, language } = useLanguage();

    // Search Inputs need their own local state for text input before selection
    const [startQuery, setStartQuery] = useState('');
    const [endQuery, setEndQuery] = useState('');
    const [activeSearchField, setActiveSearchField] = useState<'start' | 'end' | null>(null);

    // Result State
    const [pathResult, setPathResult] = useState<PathResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleReset = () => {
        setStartPoint('current');
        setStartQuery('');
        setEndPoint(null);
        setEndQuery('');
        setPathResult(null);
        onPathFound(null);
        setErrorMsg(null);
    };

    // Helper to get stop name with bilingual support
    const getStopName = (stop: Stop | string | null) => {
        if (!stop) return '';

        if (typeof stop === 'string') {
            const found = stops.find(s => s.id === stop);
            if (found) stop = found;
            else return stop;
        }

        const mainName = stop.stop_name;
        const subName = stop.stop_name_en;

        if (subName && mainName !== subName) {
            return `${mainName} (${subName})`;
        }
        return mainName;
    };

    const filterStops = (query: string) => {
        if (!query.trim()) return [];
        const lower = query.toLowerCase();
        return stops.filter(s =>
            s.stop_name.toLowerCase().includes(lower) ||
            (s.stop_name_en && s.stop_name_en.toLowerCase().includes(lower))
        ).slice(0, 5);
    };

    const startSuggestions = useMemo(() => filterStops(startQuery), [startQuery, stops]);
    const endSuggestions = useMemo(() => filterStops(endQuery), [endQuery, stops]);

    const handleFindRoute = () => {
        if (!graphEngine) {
            console.error("Graph Engine not initialized");
            return;
        }

        if (!endPoint) {
            setErrorMsg(t('select_destination' as any) || '목적지를 선택해주세요.');
            return;
        }

        let startLat, startLng;

        let effectiveStart = startPoint;

        if (!effectiveStart) {
            effectiveStart = 'current';
            setStartPoint('current');
        }

        if (effectiveStart === 'current') {
            if (!userLocation) {
                setErrorMsg(t('location_needed' as any) || '현재 위치를 가져올 수 없습니다.');
                return;
            }
            startLat = userLocation.latitude;
            startLng = userLocation.longitude;
        } else {
            const coords = (effectiveStart.location as any).coordinates;
            // Check formatted coordinates
            if (Array.isArray(coords)) {
                startLat = coords[1];
                startLng = coords[0];
            } else if ((effectiveStart.location as any).lat) {
                startLat = (effectiveStart.location as any).lat;
                startLng = (effectiveStart.location as any).lng;
            } else {
                console.error("Invalid Start Point Location Format:", effectiveStart.location);
                return;
            }
        }

        let endLat, endLng;
        const endLoc = endPoint.location as any;
        if (Array.isArray(endLoc.coordinates)) {
            endLat = endLoc.coordinates[1];
            endLng = endLoc.coordinates[0];
        } else if (endLoc.lat) {
            endLat = endLoc.lat;
            endLng = endLoc.lng;
        } else {
            console.error("Invalid End Point Location Format:", endPoint.location);
            return;
        }

        setIsCalculating(true);
        setErrorMsg(null);
        setPathResult(null);
        onPathFound(null);

        setTimeout(() => {
            try {
                const result = graphEngine.findShortestPath(startLat, startLng, endLat, endLng);

                if (result && 'code' in result) {
                    // It is a RouteError
                    const errorKey = `error_${(result as RouteError).code.toLowerCase()}`;
                    setErrorMsg(t(errorKey as any));
                } else if (result) {
                    // It is a PathResult
                    setPathResult(result as PathResult);
                    onPathFound(result as PathResult);
                } else {
                    // Should not be reachable with new logic, but fallback
                    setErrorMsg(t('no_route_found' as any));
                }
            } catch (err) {
                console.error("Calculation Crashed:", err);
                setErrorMsg('Calculation Error');
            } finally {
                setIsCalculating(false);
            }
        }, 100);
    };

    return (
        <div className="flex flex-col h-auto lg:h-full bg-slate-50">
            {/* Input Area */}
            <div className="p-4 bg-white border-b border-slate-200 space-y-3 shrink-0 relative z-20">
                {/* Reset Button (Top Right absolute) */}


                {/* Start Point */}
                <div className="relative">
                    <div className={`flex items-center gap-2 bg-slate-50 border ${activeSearchField === 'start' ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-slate-200'} rounded-lg p-3 shadow-sm transition-all`}>
                        <div className="flex-shrink-0 text-blue-600">
                            <span className="text-[10px] font-bold border border-blue-600 rounded px-1.5 py-0.5 whitespace-nowrap">START</span>
                        </div>
                        <input
                            type="text"
                            className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-slate-400"
                            placeholder={t('start_point_placeholder' as any)}
                            value={activeSearchField === 'start' ? startQuery : (startPoint === 'current' ? (t('current_location' as any)) : getStopName(startPoint))}
                            onFocus={() => {
                                if (startPoint === 'current') setStartQuery('');
                                else if (startPoint && typeof startPoint !== 'string') setStartQuery(startPoint.stop_name);
                                setActiveSearchField('start');
                            }}
                            onChange={(e) => {
                                setStartPoint(null); // Clear selected point to allow searching
                                setStartQuery(e.target.value);
                            }}
                        />
                        {startPoint !== 'current' && (
                            <button onClick={() => { setStartPoint('current'); setStartQuery(''); }} className="p-1 flex-shrink-0">
                                <X size={14} className="text-slate-400" />
                            </button>
                        )}
                    </div>
                    {/* Start Suggestions */}
                    {activeSearchField === 'start' && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto z-40">
                            <button
                                onClick={() => {
                                    setStartPoint('current');
                                    setStartQuery('');
                                    setActiveSearchField(null);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium text-blue-600 border-b border-slate-50"
                            >
                                <Navigation size={14} />
                                {t('current_location' as any)}
                            </button>
                            <button
                                onClick={() => {
                                    onSelectOnMap('start');
                                    setActiveSearchField(null);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium text-slate-700 border-b border-slate-50"
                            >
                                <MapPin size={14} />
                                {t('select_on_map' as any)}
                            </button>
                            {startSuggestions.map((stop: Stop) => (
                                <button
                                    key={stop.id}
                                    onClick={() => {
                                        setStartPoint(stop);
                                        setStartQuery('');
                                        setActiveSearchField(null);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 text-sm border-b border-slate-50 last:border-0"
                                >
                                    <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                                    <span className="truncate">{getStopName(stop)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Overlay to close suggestions */}
                    {activeSearchField === 'start' && <div className="fixed inset-0 z-30" onClick={() => setActiveSearchField(null)} />}
                </div>



                {/* End Point */}
                <div className="relative">
                    <div className={`flex items-center gap-2 bg-slate-50 border ${activeSearchField === 'end' ? 'border-red-500 ring-2 ring-red-100 bg-white' : 'border-slate-200'} rounded-lg p-3 shadow-sm transition-all`}>
                        <div className="flex-shrink-0 text-red-600">
                            <span className="text-[10px] font-bold border border-red-600 rounded px-1.5 py-0.5 whitespace-nowrap">END</span>
                        </div>
                        <input
                            type="text"
                            className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-slate-400"
                            placeholder={t('end_point_placeholder' as any)}
                            value={endPoint ? (activeSearchField === 'end' ? endQuery : getStopName(endPoint)) : endQuery}
                            onFocus={() => {
                                if (endPoint) setEndQuery(endPoint.stop_name);
                                setActiveSearchField('end');
                            }}
                            onChange={(e) => {
                                setEndPoint(null);
                                setEndQuery(e.target.value);
                            }}
                        />
                        {endPoint && (
                            <button onClick={() => { setEndPoint(null); setEndQuery(''); }} className="p-1 flex-shrink-0">
                                <X size={14} className="text-slate-400" />
                            </button>
                        )}
                    </div>
                    {/* End Suggestions */}
                    {activeSearchField === 'end' && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto z-40">
                            <button
                                onClick={() => {
                                    onSelectOnMap('end');
                                    setActiveSearchField(null);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium text-slate-700 border-b border-slate-50"
                            >
                                <MapPin size={14} />
                                {t('select_on_map' as any)}
                            </button>
                            {endSuggestions.length === 0 && !endQuery ? null : (
                                endSuggestions.length === 0 ? (
                                    <div className="p-3 text-center text-slate-400 text-xs text-sm">
                                        {t('no_search_results' as any)}
                                    </div>
                                ) : (
                                    endSuggestions.map((stop: Stop) => (
                                        <button
                                            key={stop.id}
                                            onClick={() => {
                                                setEndPoint(stop);
                                                setEndQuery('');
                                                setActiveSearchField(null);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 text-sm border-b border-slate-50 last:border-0"
                                        >
                                            <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                                            <span className="truncate">{getStopName(stop)}</span>
                                        </button>
                                    ))
                                )
                            )}
                        </div>
                    )}
                    {activeSearchField === 'end' && <div className="fixed inset-0 z-30" onClick={() => setActiveSearchField(null)} />}
                </div>

                <div className="flex gap-2">
                    {/* Find Button */}
                    <button
                        onClick={handleFindRoute}
                        disabled={isCalculating || !endPoint}
                        className={`flex-1 py-2 rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2
                    ${(isCalculating || !endPoint) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        style={(isCalculating || !endPoint) ? { backgroundColor: '#cbd5e1', color: '#64748b' } : { backgroundColor: '#2563eb', color: '#ffffff' }}
                    >
                        {isCalculating ? (
                            <>
                                <RefreshCw className="animate-spin" size={18} />
                                Calculating...
                            </>
                        ) : (
                            <>
                                {t('search_route' as any)}
                            </>
                        )}
                    </button>

                    {/* Reset Button (Only visible if something is set) */}
                    {(startPoint || endPoint || pathResult || startQuery || endQuery) && (
                        <button
                            onClick={() => {
                                setStartPoint(null);
                                setStartQuery('');
                                setEndPoint(null);
                                setEndQuery('');
                                setPathResult(null);
                                onPathFound(null);
                                setErrorMsg(null);
                            }}
                            className="px-4 py-2 rounded-lg font-bold border-2 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all flex items-center justify-center whitespace-nowrap"
                        >
                            {language === 'ko' ? '초기화' : 'Reset'}
                        </button>
                    )}
                </div>

                {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-fadeIn">
                        <span className="font-bold">Error:</span> {errorMsg}
                    </div>
                )}
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-visible lg:overflow-y-auto p-4 space-y-4 flex flex-col">
                {pathResult ? (
                    <div className="animate-fadeIn space-y-4 pb-20">
                        {/* Summary Card */}
                        <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                                    <Clock size={20} className="text-blue-600" />
                                    {Math.round(pathResult.totalTimeMinutes)} min
                                </div>
                                <div className="text-sm text-slate-500">
                                    {(pathResult.totalDistanceKm).toFixed(1)} km
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                                * {language === 'ko' ? '예상 소요시간은 실제 교통상황에 따라 다를 수 있습니다.' : 'Time is estimated and may vary.'}
                            </div>
                        </div>

                        {/* Segments List */}
                        <div className="space-y-0 relative border-l-2 border-slate-200 ml-4 pl-6 pb-2">
                            {pathResult.segments.map((segment, idx) => (
                                <div key={idx} className="relative mb-6 last:mb-0">
                                    {/* Dot Indicator */}
                                    <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 
                        ${segment.routeId === 'WALK' ? 'bg-slate-400 border-white' : 'bg-blue-600 border-white'} shadow-sm z-10`}
                                    />

                                    {/* Segment Content */}
                                    <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                                {segment.routeId === 'WALK' ? (
                                                    <>
                                                        <span>🚶 {t('walk_segment' as any)}</span>
                                                    </>
                                                ) : (
                                                    (() => {
                                                        const safeRoutes = routes || [];
                                                        const route = safeRoutes.find(r => r.id === segment.routeId);
                                                        const routeColor = route?.route_color || '#16a34a';
                                                        return (
                                                            <>
                                                                <Bus size={16} style={{ color: routeColor }} />
                                                                <span style={{ color: routeColor }}>
                                                                    {t('bus_segment' as any)} {segment.description}
                                                                </span>
                                                            </>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                            <span className="text-xs font-mono text-slate-500">
                                                {Math.round(segment.timeMinutes)} min
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {segment.routeId === 'WALK' ? (
                                                <span>{t('walk_instruction' as any)}</span>
                                            ) : (
                                                <div className="flex flex-col gap-1 mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                                                        {getStopName(segment.fromStopId)}
                                                    </div>
                                                    <div className="pl-2 border-l border-dashed border-slate-300 h-3"></div>
                                                    <div className="flex items-center gap-1 font-medium text-slate-700">
                                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                        {getStopName(segment.toStopId)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {/* End Dot */}
                            <div className="absolute -left-[31px] bottom-0 w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm z-10" />
                            <div className="absolute -left-[24px] bottom-1 text-xs font-bold text-red-600 w-20 transform translate-y-1/2">
                                END
                            </div>
                        </div>
                    </div>
                ) : (
                    // Placeholder when no search
                    !isCalculating && !errorMsg && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-10 mt-10">
                            <div className="bg-slate-100 p-4 rounded-full mb-3">
                                <Navigation size={32} />
                            </div>
                            <p className="text-sm text-center">
                                {language === 'ko' ? '출발지와 도착지를 설정하여\n최적의 경로를 검색하세요.' : 'Set start and end points\nto find the best route.'}
                            </p>
                        </div>

                    )
                )}
            </div>
        </div>
    );
}
