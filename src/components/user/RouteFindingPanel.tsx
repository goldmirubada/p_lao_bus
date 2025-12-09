'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, MapPin, Navigation, Bus, Clock, RefreshCw, Map as MapIcon, RotateCcw, Search } from 'lucide-react';
import { Stop, Route } from '@/lib/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { NetworkGraph } from '@/lib/graph/NetworkGraph';
import { PathResult } from '@/lib/graph/types';

interface RouteFindingPanelProps {
    isOpen: boolean;
    onClose: () => void;
    userLocation: GeolocationCoordinates | null;
    stops: Stop[];
    graphEngine: NetworkGraph | null;
    onPathFound: (path: PathResult | null) => void;
    onSelectOnMap: (type: 'start' | 'end') => void;
    selectingType?: 'start' | 'end' | null;
    startPoint: Stop | 'current';
    setStartPoint: (point: Stop | 'current') => void;
    endPoint: Stop | null;
    setEndPoint: (point: Stop | null) => void;
    routes: Route[];
}

export default function RouteFindingPanel({
    isOpen,
    onClose,
    userLocation,
    stops,
    graphEngine,
    onPathFound,
    onSelectOnMap,
    selectingType,
    startPoint,
    setStartPoint,
    endPoint,
    setEndPoint,
    routes
}: RouteFindingPanelProps) {
    const { t, language } = useLanguage();

    // Search Inputs
    const [startQuery, setStartQuery] = useState('');
    const [endQuery, setEndQuery] = useState('');
    const [isSearchingStart, setIsSearchingStart] = useState(false);
    const [isSearchingEnd, setIsSearchingEnd] = useState(false);

    // View Mode State
    const [viewMode, setViewMode] = useState<'full' | 'minimized'>('full');

    const handleReset = () => {
        setStartPoint('current');
        setStartQuery('');
        setEndPoint(null);
        setEndQuery('');
        onPathFound(null); // Clear path on map
        onClose(); // Close panel
    };

    // Result State
    const [pathResult, setPathResult] = useState<PathResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Helper to get stop name with bilingual support
    const getStopName = (stop: Stop | string) => {
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

        console.log("--- START ROUTE FIND ---");
        console.log("Start Point Raw:", startPoint);
        console.log("End Point Raw:", endPoint);

        if (!endPoint) {
            setErrorMsg(t('select_destination' as any) || '목적지를 선택해주세요.');
            return;
        }

        let startLat, startLng;

        if (startPoint === 'current') {
            if (!userLocation) {
                setErrorMsg(t('location_needed' as any) || '현재 위치를 가져올 수 없습니다.');
                return;
            }
            startLat = userLocation.latitude;
            startLng = userLocation.longitude;
        } else {
            const coords = (startPoint.location as any).coordinates;
            // Check formatted coordinates
            if (Array.isArray(coords)) {
                startLat = coords[1];
                startLng = coords[0];
            } else if ((startPoint.location as any).lat) {
                startLat = (startPoint.location as any).lat;
                startLng = (startPoint.location as any).lng;
            } else {
                console.error("Invalid Start Point Location Format:", startPoint.location);
                return;
            }
        }

        const endCoords = (endPoint.location as any).coordinates;
        const endLat = endCoords[1];
        const endLng = endCoords[0];

        setIsCalculating(true);
        setErrorMsg(null);
        setPathResult(null);
        onPathFound(null);

        setTimeout(() => {
            try {
                console.log(`[Algorithm Input] Start: (${startLat}, ${startLng}), End: (${endLat}, ${endLng})`);
                console.time('RouteCalc');

                const result = graphEngine.findShortestPath(startLat, startLng, endLat, endLng);

                console.timeEnd('RouteCalc');
                console.log('[Algorithm Output] Result:', result);

                if (result) {
                    setPathResult(result);
                    onPathFound(result);
                } else {
                    console.warn('[Algorithm Output] Result is null - No Route Found');
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 left-0 w-full sm:w-[400px] bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out border-r border-slate-200 flex flex-col">

            {/* Header */}
            <div className="bg-white border-b border-slate-200 shrink-0">
                <div className="p-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Navigation className="text-blue-600" />
                        {t('find_route' as any)}
                    </h2>

                    <div className="flex items-center gap-2">
                        {/* Map Mode Toggle */}
                        {viewMode === 'full' && (
                            <button
                                onClick={() => setViewMode('minimized')}
                                className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5"
                                title={t('tab_map' as any) || 'Map View'}
                            >
                                <MapIcon size={16} />
                                <span className="text-xs font-medium">{t('tab_map' as any) || 'Map'}</span>
                            </button>
                        )}

                        {/* Reset Button */}
                        <button
                            onClick={handleReset}
                            className="px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1.5"
                            title={t('tab_reset' as any) || 'Reset'}
                        >
                            <RotateCcw size={16} />
                            <span className="text-xs font-medium">{t('tab_reset' as any) || 'Reset'}</span>
                        </button>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-1.5 ml-1 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area - Only visible in 'full' mode */}
            {viewMode === 'full' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Input Area */}
                    <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-3 shrink-0">

                        {/* Start Point */}
                        <div className="relative z-20">
                            <div className={`flex items-center gap-2 bg-white border ${isSearchingStart ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'} rounded-lg p-3 shadow-sm transition-all`}>
                                <div className="flex-shrink-0 text-blue-600">
                                    <span className="text-[10px] font-bold border border-blue-600 rounded px-1.5 py-0.5 whitespace-nowrap">START</span>
                                </div>
                                <input
                                    type="text"
                                    className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-slate-400"
                                    placeholder={t('start_point_placeholder' as any)}
                                    value={startPoint === 'current' ? (t('current_location' as any)) : (isSearchingStart ? startQuery : getStopName(startPoint))}
                                    onFocus={() => {
                                        if (startPoint === 'current') setStartQuery('');
                                        else if (typeof startPoint !== 'string') setStartQuery(startPoint.stop_name);
                                        setIsSearchingStart(true);
                                        setIsSearchingEnd(false);
                                    }}
                                    onChange={(e) => {
                                        setStartPoint('current'); // Reset to modify
                                        setStartQuery(e.target.value);
                                    }}
                                />
                                {startPoint !== 'current' && (
                                    <button onClick={() => { setStartPoint('current'); setStartQuery(''); }} className="p-1 flex-shrink-0">
                                        <X size={14} className="text-slate-400" />
                                    </button>
                                )}
                            </div>
                            {isSearchingStart && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto">
                                    {/* Current Location Option */}
                                    <button
                                        onClick={() => {
                                            setStartPoint('current');
                                            setStartQuery('');
                                            setIsSearchingStart(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium text-blue-600 border-b border-slate-50"
                                    >
                                        <Navigation size={14} />
                                        {t('current_location' as any)}
                                    </button>

                                    {/* Select on Map Option */}
                                    <button
                                        onClick={() => {
                                            onSelectOnMap('start');
                                            setIsSearchingStart(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium text-slate-700 border-b border-slate-50"
                                    >
                                        <MapIcon size={14} />
                                        {t('select_on_map' as any)}
                                    </button>

                                    {/* Suggestions */}
                                    {startSuggestions.map((stop: Stop) => (
                                        <button
                                            key={stop.id}
                                            onClick={() => {
                                                setStartPoint(stop);
                                                setStartQuery('');
                                                setIsSearchingStart(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 text-sm border-b border-slate-50 last:border-0"
                                        >
                                            <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                                            <span className="truncate">{getStopName(stop)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {isSearchingStart && <div className="fixed inset-0 z-[-1]" onClick={() => setIsSearchingStart(false)} />}
                        </div>

                        {/* Vertical Connector */}
                        <div className="absolute left-[29px] top-[115px] h-4 w-0.5 bg-slate-300 z-0"></div>

                        {/* End Point */}
                        <div className="relative z-10">
                            <div className={`flex items-center gap-2 bg-white border ${isSearchingEnd ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200'} rounded-lg p-3 shadow-sm transition-all`}>
                                <div className="flex-shrink-0 text-red-600">
                                    <span className="text-[10px] font-bold border border-red-600 rounded px-1.5 py-0.5 whitespace-nowrap">END</span>
                                </div>
                                <input
                                    type="text"
                                    className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-slate-400"
                                    placeholder={t('end_point_placeholder' as any)}
                                    value={endPoint ? (isSearchingEnd ? endQuery : getStopName(endPoint)) : endQuery}
                                    onFocus={() => {
                                        if (endPoint) setEndQuery(endPoint.stop_name);
                                        setIsSearchingEnd(true);
                                        setIsSearchingStart(false);
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
                            {isSearchingEnd && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto">
                                    {/* Select on Map Option */}
                                    <button
                                        onClick={() => {
                                            onSelectOnMap('end');
                                            setIsSearchingEnd(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-2 text-sm font-medium text-slate-700 border-b border-slate-50"
                                    >
                                        <MapIcon size={14} />
                                        {t('select_on_map' as any)}
                                    </button>

                                    {/* Suggestions */}
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
                                                        setIsSearchingEnd(false);
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
                            {isSearchingEnd && <div className="fixed inset-0 z-[-1]" onClick={() => setIsSearchingEnd(false)} />}
                        </div>

                        {/* Find Button */}
                        <button
                            onClick={handleFindRoute}
                            disabled={isCalculating || !endPoint}
                            className={`w-full py-3 rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2
                ${(isCalculating || !endPoint) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
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

                        {errorMsg && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-fadeIn">
                                <span className="font-bold">Error:</span> {errorMsg}
                            </div>
                        )}
                    </div>

                    {/* Results Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                                                const route = routes.find(r => r.id === segment.routeId);
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
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-10">
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
            )}

            {viewMode === 'minimized' && (
                <div className="p-4 bg-white/90 backdrop-blur-sm flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-slate-700 font-medium my-1">
                        <MapIcon size={16} className="text-blue-600" />
                        {language === 'ko' ? '지도 보기 모드' : 'Map View Mode'}
                    </div>
                    <button
                        onClick={() => setViewMode('full')}
                        className="text-blue-600 text-sm font-bold border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                    >
                        {t('open_panel' as any) || 'Open Panel'}
                    </button>
                </div>
            )}
        </div>
    );
}
