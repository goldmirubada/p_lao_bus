'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Search as SearchIcon, X, MapPin, ChevronDown, Check, Star, Info } from 'lucide-react';
import { Route, Stop, RouteStopWithDetail } from '@/lib/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface SearchTabProps {
    routes: Route[];
    routeStops: { [key: string]: RouteStopWithDetail[] };
    stops: Stop[];
    onRouteSelect: (routeId: string) => void;
    onStopSelect: (stop: Stop) => void;
    selectedRoute: string;
    isFavorite: (routeId: string) => boolean;
    toggleFavorite: (routeId: string) => void;
}

export default function SearchTab({
    routes,
    routeStops,
    stops,
    onRouteSelect,
    onStopSelect,
    selectedRoute,
    isFavorite,
    toggleFavorite
}: SearchTabProps) {
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Memoize the selected route object
    const selectedRouteObj = useMemo(() => {
        return routes.find(r => r.id === selectedRoute);
    }, [routes, selectedRoute]);

    const filteredResults = useMemo(() => {
        const lowerQuery = query.toLowerCase().trim();
        let foundRoutes = routes;
        let foundStops = stops;

        if (lowerQuery) {
            foundRoutes = routes.filter(route =>
                route.route_number.toLowerCase().includes(lowerQuery) ||
                route.route_name.toLowerCase().includes(lowerQuery) ||
                (route.description && route.description.toLowerCase().includes(lowerQuery))
            );

            foundStops = stops.filter(stop =>
                stop.stop_name.toLowerCase().includes(lowerQuery) ||
                (stop.stop_name_en && stop.stop_name_en.toLowerCase().includes(lowerQuery))
            ).slice(0, 20);
        } else {
            // Default state: empty text query
            foundStops = [];
        }

        return { routes: foundRoutes, stops: foundStops };
    }, [query, routes, stops]);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Custom Route Selector */}
            <div className="p-4 bg-white border-b border-slate-200 z-40 relative" ref={dropdownRef}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-600 pl-2">
                        {t('all_routes_map') || '전체 노선도'}
                    </h3>
                    <button
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`text-xs flex items-center gap-1 transition-colors ${showFavoritesOnly ? 'text-yellow-500 font-bold' : 'text-slate-500 hover:text-blue-600'}`}
                    >
                        <Star size={12} className={showFavoritesOnly ? "fill-current" : ""} />
                        {t('favorites') || '즐겨찾기'}
                    </button>
                </div>

                <div className="relative">
                    {/* Trigger Button */}
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-left"
                    >
                        <div className="flex items-center gap-3">
                            {selectedRoute === 'all' ? (
                                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                                    ALL
                                </div>
                            ) : (
                                <div
                                    className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-sm"
                                    style={{ backgroundColor: selectedRouteObj?.route_color || '#64748b' }}
                                >
                                    {selectedRouteObj?.route_number}
                                </div>
                            )}
                            <span className="font-bold text-slate-700">
                                {selectedRoute === 'all' ? (t('all_routes_map') || '전체 노선 보기') : selectedRouteObj?.route_name}
                            </span>
                        </div>
                        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Options */}
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-[400px] overflow-y-auto animate-fadeIn z-[100]">
                            {/* Option: All Routes */}
                            <button
                                onClick={() => {
                                    onRouteSelect('all');
                                    setIsDropdownOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                                    ALL
                                </div>
                                <span className="font-bold text-slate-700 flex-1">
                                    {t('all_routes_map') || '전체 노선 보기'}
                                </span>
                                {selectedRoute === 'all' && <Check size={16} className="text-blue-600" />}
                            </button>

                            {/* Route List */}
                            {routes
                                .filter(route => !showFavoritesOnly || isFavorite(route.id))
                                .map(route => {
                                    const isFav = isFavorite(route.id);
                                    return (
                                        <div key={route.id} className="relative group">
                                            <button
                                                onClick={() => {
                                                    onRouteSelect(route.id);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 transition-colors"
                                            >
                                                <div
                                                    className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-sm"
                                                    style={{ backgroundColor: route.route_color }}
                                                >
                                                    {route.route_number}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-700 text-sm">
                                                        {route.route_name}
                                                    </div>
                                                    <div className="text-xs text-slate-400 truncate max-w-[180px]">
                                                        {route.route_number}
                                                    </div>
                                                </div>
                                                {selectedRoute === route.id && <Check size={16} className="text-blue-600 mr-8" />}
                                            </button>

                                            {/* Favorite Toggle */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(route.id);
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
                                            >
                                                <Star
                                                    size={16}
                                                    className={isFav ? "text-yellow-400 fill-yellow-400" : "text-slate-300 hover:text-slate-400"}
                                                />
                                            </button>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>

            {/* Stops Search */}
            <div className="px-4 pb-4 pt-2 bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:placeholder-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
                        placeholder={t('search_placeholder') || "노선 번호 또는 정류장 검색..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                            <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area: Search Results OR Stop List */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {query ? (
                    /* Search Results */
                    <div className="flex-1 overflow-y-auto">
                        {/* Routes Section */}
                        {filteredResults.routes.length > 0 && (
                            <div className="bg-white mb-2">
                                <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100">
                                    {t('route_info') || '노선'} ({filteredResults.routes.length})
                                </div>
                                {filteredResults.routes.map(route => (
                                    <button
                                        key={route.id}
                                        onClick={() => onRouteSelect(route.id)}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 group border-b border-slate-50 last:border-0"
                                    >
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0 transition-transform group-hover:scale-110"
                                            style={{ backgroundColor: route.route_color }}
                                        >
                                            {route.route_number}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 text-sm group-hover:text-blue-700 truncate">
                                                {route.route_name}
                                            </div>
                                            <div className="text-xs text-slate-500 truncate mt-0.5">
                                                {route.description || t('no_description')}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Stops Section */}
                        {filteredResults.stops.length > 0 && (
                            <div className="bg-white">
                                <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100">
                                    {t('total_stops') || '정류장'} ({filteredResults.stops.length})
                                </div>
                                {filteredResults.stops.map(stop => (
                                    <button
                                        key={stop.id}
                                        onClick={() => onStopSelect(stop)}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 group border-b border-slate-50 last:border-0"
                                    >
                                        <div className="mt-1 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors flex-shrink-0">
                                            <MapPin size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 text-sm group-hover:text-blue-700 truncate">
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

                        {/* No Results */}
                        {filteredResults.routes.length === 0 && filteredResults.stops.length === 0 && (
                            <div className="p-8 text-center text-slate-500">
                                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <SearchIcon size={24} className="text-slate-400" />
                                </div>
                                <p className="text-sm font-medium">{t('no_search_results') || '검색 결과가 없습니다.'}</p>
                                <p className="text-xs mt-1 text-slate-400">다른 검색어를 입력해보세요.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Stop List (If route selected) */
                    selectedRoute !== 'all' ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100 mb-2">
                                {t('route_stops') || '정류장 목록'}
                            </div>
                            <div className="flex-1 overflow-y-auto px-4 pb-4">
                                {(() => {
                                    const currentStops = routeStops[selectedRoute] || [];
                                    const uniqueStopList = currentStops;

                                    if (uniqueStopList.length === 0) {
                                        return <div className="text-center py-8 text-slate-400 text-sm">No stops found.</div>;
                                    }

                                    const route = routes.find(r => r.id === selectedRoute);

                                    return (
                                        <div className="space-y-0 relative">
                                            {/* Vertical Line */}
                                            {uniqueStopList.length > 1 && (
                                                <div
                                                    className="absolute left-6 top-8 bottom-8 w-1 -z-10 opacity-30"
                                                    style={{ backgroundColor: route?.route_color || '#cbd5e1' }}
                                                ></div>
                                            )}

                                            {uniqueStopList.map((rs, index) => (
                                                <div key={rs.id} className="relative flex items-center group">
                                                    <button
                                                        onClick={() => onStopSelect(rs.stops)}
                                                        className="flex items-center gap-4 p-3 w-full hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                                                    >
                                                        <div
                                                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-md flex-shrink-0 ring-4 ring-slate-50 group-hover:ring-white transition-all text-sm"
                                                            style={{ backgroundColor: route?.route_color || '#64748b' }}
                                                        >
                                                            {index + 1}
                                                        </div>

                                                        <div className="flex-1 text-left overflow-hidden">
                                                            <div className="font-semibold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                                                                {rs.stops?.stop_name}
                                                            </div>
                                                            {rs.stops?.stop_name_en && (
                                                                <div className="text-xs text-slate-500 truncate">
                                                                    {rs.stops.stop_name_en}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MapPin size={16} className="text-blue-500" />
                                                        </div>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : (
                        /* Placeholder */
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-8 text-center opacity-60">
                            <div className="flex flex-col items-center gap-2">
                                <div className="text-4xl">🚍</div>
                                <p>{t('select_route_desc') || 'Select a route to see stops'}</p>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
