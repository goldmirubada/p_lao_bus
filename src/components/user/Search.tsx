'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, MapPin, Bus } from 'lucide-react';
import { Route, Stop } from '@/lib/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface SearchProps {
    routes: Route[];
    stops: Stop[];
    onRouteSelect: (routeId: string) => void;
    onStopSelect: (stop: Stop) => void;
}

export default function Search({ routes, stops, onRouteSelect, onStopSelect }: SearchProps) {
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredResults = useMemo(() => {
        if (!query.trim()) return { routes: [], stops: [] };

        const lowerQuery = query.toLowerCase();

        // 1. Search Routes
        const foundRoutes = routes.filter(route =>
            route.route_number.toLowerCase().includes(lowerQuery) ||
            route.route_name.toLowerCase().includes(lowerQuery) ||
            (route.description && route.description.toLowerCase().includes(lowerQuery))
        );

        // 2. Search Stops
        // Limit stops to 20 to preserve performance
        const foundStops = stops.filter(stop =>
            stop.stop_name.toLowerCase().includes(lowerQuery) ||
            (stop.stop_name_en && stop.stop_name_en.toLowerCase().includes(lowerQuery))
        ).slice(0, 20);

        return { routes: foundRoutes, stops: foundStops };
    }, [query, routes, stops]);

    const handleSelectRoute = (routeId: string) => {
        onRouteSelect(routeId);
        setIsOpen(false);
        setQuery('');
    };

    const handleSelectStop = (stop: Stop) => {
        onStopSelect(stop);
        setIsOpen(false);
        setQuery('');
    };

    return (
        <div className="relative mb-4" ref={searchRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-shadow"
                    placeholder={t('search_placeholder') || "노선 번호 또는 정류장 검색..."}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setIsOpen(false);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                        <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && query.trim() !== '' && (
                <div className="absolute mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 max-h-[60vh] overflow-y-auto z-50 animate-fadeIn">

                    {/* No Results */}
                    {filteredResults.routes.length === 0 && filteredResults.stops.length === 0 && (
                        <div className="p-4 text-center text-slate-500 text-sm">
                            {t('no_search_results') || '검색 결과가 없습니다.'}
                        </div>
                    )}

                    {/* Routes Section */}
                    {filteredResults.routes.length > 0 && (
                        <div className="border-b border-slate-50 last:border-0">
                            <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                                {t('route_info') || '노선'} ({filteredResults.routes.length})
                            </div>
                            {filteredResults.routes.map(route => (
                                <button
                                    key={route.id}
                                    onClick={() => handleSelectRoute(route.id)}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                                >
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
                                        style={{ backgroundColor: route.route_color }}
                                    >
                                        {route.route_number}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                                            {route.route_name}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Stops Section */}
                    {filteredResults.stops.length > 0 && (
                        <div>
                            <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                                {t('total_stops') || '정류장'} ({filteredResults.stops.length})
                            </div>
                            {filteredResults.stops.map(stop => (
                                <button
                                    key={stop.id}
                                    onClick={() => handleSelectStop(stop)}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 group border-b border-slate-50 last:border-0"
                                >
                                    <div className="mt-1 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors flex-shrink-0">
                                        <MapPin size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                                            {stop.stop_name}
                                        </div>
                                        {stop.stop_name_en && (
                                            <div className="text-xs text-slate-500 truncate mt-0.5">
                                                {stop.stop_name_en}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
