'use client';

import { Stop, Route, RouteStopWithDetail } from '@/lib/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { NetworkGraph } from '@/lib/graph/NetworkGraph';
import { PathResult } from '@/lib/graph/types';
import { Bus, Navigation } from 'lucide-react';
import SearchTab from './SearchTab';
import RouteFindingTab from './RouteFindingTab';

interface MainPanelProps {
    userLocation: GeolocationCoordinates | null;
    stops: Stop[];
    routes: Route[];
    routeStops: { [key: string]: RouteStopWithDetail[] };
    graphEngine: NetworkGraph | null;
    onRouteSelect: (routeId: string) => void;
    onStopSelect: (stop: Stop) => void;
    onPathFound: (path: PathResult | null) => void;
    onSelectOnMap: (type: 'start' | 'end') => void;
    // Route Finding State
    selectingType?: 'start' | 'end' | null;
    startPoint: Stop | 'current' | null;
    setStartPoint: (point: Stop | 'current' | null) => void;
    endPoint: Stop | null;
    setEndPoint: (point: Stop | null) => void;

    // Selection State
    selectedRoute: string;
    isFavorite: (routeId: string) => boolean;
    toggleFavorite: (routeId: string) => void;
    // Tab Control
    activeTab: 'search' | 'route';
    onTabChange: (tab: 'search' | 'route') => void;
}

export default function MainPanel({
    userLocation,
    stops = [],
    routes = [],
    routeStops = {},
    graphEngine,
    onRouteSelect,
    onStopSelect,
    onPathFound,
    onSelectOnMap,
    selectingType,
    startPoint,
    setStartPoint,
    endPoint,
    setEndPoint,
    activeTab,
    onTabChange,
    selectedRoute,
    isFavorite,
    toggleFavorite
}: MainPanelProps) {
    const { t } = useLanguage();

    return (
        <div className="bg-white rounded-xl shadow-lg h-full flex flex-col border border-slate-200 overflow-hidden">
            {/* Tab Header */}
            <div className="flex border-b border-slate-200 bg-white shrink-0 rounded-t-xl overflow-hidden">
                <button
                    onClick={() => onTabChange('search')}
                    className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative
                    ${activeTab === 'search' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Bus size={18} />
                    {t('route_info') || '노선 검색'}
                    {activeTab === 'search' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                </button>
                <button
                    onClick={() => onTabChange('route')}
                    className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative
                    ${activeTab === 'route' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Navigation size={18} />
                    {t('find_route') || '길찾기'}
                    {activeTab === 'route' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                    )}
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
                <div className={`flex-col h-full ${activeTab === 'search' ? 'flex' : 'hidden'}`}>
                    <SearchTab
                        routes={routes}
                        routeStops={routeStops}
                        stops={stops}
                        onRouteSelect={onRouteSelect}
                        onStopSelect={onStopSelect}
                        selectedRoute={selectedRoute}
                        isFavorite={isFavorite}
                        toggleFavorite={toggleFavorite}
                    />
                </div>
                <div className={`flex-col h-full ${activeTab === 'route' ? 'flex' : 'hidden'}`}>
                    <RouteFindingTab
                        userLocation={userLocation}
                        stops={stops}
                        routes={routes}
                        graphEngine={graphEngine}
                        onPathFound={onPathFound}
                        onSelectOnMap={(type) => {
                            onSelectOnMap(type);
                        }}
                        startPoint={startPoint}
                        setStartPoint={setStartPoint}
                        endPoint={endPoint}
                        setEndPoint={setEndPoint}
                    />
                </div>
            </div>
        </div>
    );
}
