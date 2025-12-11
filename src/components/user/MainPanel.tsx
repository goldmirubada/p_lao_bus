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

    // Alarm State
    alarmTargetStop: Stop | null;
    isAlarmActive: boolean;

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
    toggleFavorite,
    alarmTargetStop,
    isAlarmActive
}: MainPanelProps) {
    const { t } = useLanguage();

    return (
        <div className="bg-white rounded-xl shadow-lg h-full flex flex-col border border-slate-200 overflow-hidden">
            {/* Tab Header - Segmented Control */}
            <div className="p-3 bg-white border-b border-slate-100">
                <div className="flex p-1 bg-slate-100/80 rounded-xl relative">
                    <button
                        onClick={() => onTabChange('search')}
                        className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all duration-200 z-10
                    ${activeTab === 'search'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                        <Bus size={16} />
                        {t('route_info') || '노선 검색'}
                    </button>
                    <button
                        onClick={() => onTabChange('route')}
                        className={`flex-1 py-2.5 text-sm font-bold flex items-center justify-center gap-2 rounded-lg transition-all duration-200 z-10
                    ${activeTab === 'route'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                        <Navigation size={16} />
                        {t('find_route') || '길찾기'}
                    </button>
                </div>
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
                        alarmTargetStop={alarmTargetStop}
                        isAlarmActive={isAlarmActive}
                        userLocation={userLocation}
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
