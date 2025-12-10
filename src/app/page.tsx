'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Route, Stop, RouteStop } from '@/lib/supabase/types';
import { decryptData } from '@/lib/encryption';
import { getSecureKeyFromWasm } from '@/lib/wasm-loader';
import { MapPin, Navigation as NavigationIcon, Info, Star, AlertTriangle, CarFront, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import GoogleMapsWrapper from '@/components/admin/GoogleMapsWrapper';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useStopAlarm } from '@/hooks/useStopAlarm';
import NearMePanel from '@/components/user/NearMePanel';
import BottomSheet from '@/components/shared/BottomSheet';
import LoginButton from '@/components/auth/LoginButton';
import FeedbackModal from '@/components/user/FeedbackModal';
import { ROUTE_FARES, formatFare } from '@/constants/fares';
import Footer from '@/components/layout/Footer';
import { NetworkGraph } from '@/lib/graph/NetworkGraph';
import { PathResult } from '@/lib/graph/types';
import MainPanel from '@/components/user/MainPanel';
import { calculateDistance } from '@/lib/graph/geoUtils';

const RouteMap = dynamic(() => import('@/components/user/RouteMap'), { ssr: false });

type RouteStopWithDetail = RouteStop & {
  stops: Stop;
};

export default function SchematicMap() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeStops, setRouteStops] = useState<{ [key: string]: RouteStopWithDetail[] }>({});
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [isNearMeOpen, setIsNearMeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'route'>('search');
  const [startRoutePoint, setStartRoutePoint] = useState<Stop | 'current' | null>('current');
  const [endRoutePoint, setEndRoutePoint] = useState<Stop | null>(null);
  const [currentPath, setCurrentPath] = useState<PathResult | null>(null);

  // Route Finding Map Selection
  const [selectingRoutePoint, setSelectingRoutePoint] = useState<'start' | 'end' | null>(null);
  const [mapSelectedStop, setMapSelectedStop] = useState<Stop | null>(null);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { location: userLocation, loading: locationLoading, error: locationError } = useGeolocation();

  // Initialize Graph Engine
  const graphEngine = useMemo(() => new NetworkGraph(), []);

  // Rebuild graph when data changes (handles both API fetch and Cache load)
  useEffect(() => {
    if (routes.length > 0 && Object.keys(routeStops).length > 0) {
      console.log('Building Route Graph...');
      console.time('GraphBuild');
      graphEngine.buildGraph(routes, routeStops);
      console.timeEnd('GraphBuild');
    }
  }, [routes, routeStops, graphEngine]);

  const {
    targetStop: alarmTargetStop,
    isAlarmActive,
    setAlarm,
    cancelAlarm
  } = useStopAlarm({
    userLocation,
    onAlarmTriggered: () => {
      alert(t('alarm_triggered') + '\n' + t('alarm_desc'));
    }
  });

  const allUniqueStops = useMemo(() => {
    const stopsMap = new Map<string, Stop>();
    Object.values(routeStops).flat().forEach(rs => {
      stopsMap.set(rs.stops.id, rs.stops);
    });
    return Array.from(stopsMap.values());
  }, [routeStops]);

  const filteredRoutes = useMemo(() => {
    return selectedRoute === 'all' ? routes : routes.filter(r => r.id === selectedRoute);
  }, [routes, selectedRoute]);

  const handleTabChange = (tab: 'search' | 'route') => {
    setActiveTab(tab);
    // State is preserved, no clearing
  };

  const displayedRoutes = showFavoritesOnly
    ? routes.filter(r => isFavorite(r.id))
    : routes;

  useEffect(() => {
    fetchData();
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiBase}/api/map-data`, { cache: 'no-store' });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Details:', errorData);
        throw new Error(errorData.details || `API Error: ${response.status}`);
      }

      const { payload } = await response.json();
      if (!payload) throw new Error('No payload received');

      let secretKey = '';
      try {
        secretKey = await getSecureKeyFromWasm();
      } catch (e) {
        console.error('WASM Load Failed', e);
        throw new Error('Security Module Error');
      }

      const decryptedData = decryptData(payload, secretKey);
      if (!decryptedData) throw new Error('Decryption failed');

      const { routes: routesData, routeStops: stopsData } = decryptedData;

      if (routesData && stopsData) {
        // Graph will be built by useEffect
      }

      if (routesData) {
        setRoutes(routesData);
        localStorage.setItem('cached_routes', JSON.stringify(routesData));
      }

      if (stopsData) {
        setRouteStops(stopsData);
        localStorage.setItem('cached_stop_data', JSON.stringify(stopsData));
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      const cachedRoutes = localStorage.getItem('cached_routes');
      const cachedStops = localStorage.getItem('cached_stop_data');

      if (cachedRoutes && cachedStops) {
        setRoutes(JSON.parse(cachedRoutes));
        setRouteStops(JSON.parse(cachedStops));
        console.log('Loaded data from offline cache');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">{t('map_loading_text') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-slate-200 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{t('title')}</h1>
                <p className="text-xs sm:text-sm text-slate-500">Laos Bus Route Map</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Alarm Status Banner */}
      {isAlarmActive && alarmTargetStop && (
        <div className="bg-blue-600 text-white p-3 text-sm flex items-center justify-between animate-fadeIn px-4 z-20">
          <div className="flex items-center gap-2">
            <span className="animate-pulse">🔔</span>
            <span>{t('stop_alarm_monitoring')}: <strong>{alarmTargetStop.stop_name}</strong></span>
          </div>
          <button
            onClick={cancelAlarm}
            className="text-white/80 hover:text-white underline text-xs"
          >
            {t('cancel_alarm')}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-8 flex-1 w-full flex flex-col min-h-0">
        {routes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center my-auto">
            <div className="text-6xl mb-4">🚍</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('no_routes_title') || 'Routes not found'}</h2>
            <p className="text-slate-600">{t('no_routes_desc') || 'Please add routes in admin panel.'}</p>
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 flex-1 lg:h-full">
            {/* Left Column: Tabs */}
            <div className="w-full lg:col-span-1 h-auto lg:h-full min-h-0">
              <MainPanel
                userLocation={userLocation as any}
                stops={allUniqueStops}
                routes={routes}
                routeStops={routeStops}
                graphEngine={graphEngine}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onRouteSelect={(routeId: string) => {
                  setSelectedRoute(routeId);
                }}
                onStopSelect={(stop: Stop) => {
                  setSelectedStop(stop);
                }}
                onPathFound={(path: PathResult | null) => setCurrentPath(path)}
                onSelectOnMap={(type: 'start' | 'end') => setSelectingRoutePoint(type)}
                selectingType={selectingRoutePoint}
                startPoint={startRoutePoint}
                setStartPoint={setStartRoutePoint}
                endPoint={endRoutePoint}
                setEndPoint={setEndRoutePoint}
                selectedRoute={selectedRoute}
                isFavorite={isFavorite}
                toggleFavorite={toggleFavorite}
              />
            </div>

            {/* Right Column: Route Map */}
            <div className="w-full lg:col-span-2 h-[500px] lg:h-full min-h-0">
              <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 shrink-0">
                  <div className="flex-1 flex items-center overflow-hidden">
                    {selectedRoute === 'all' ? (
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className="text-blue-600" />
                        {t('all_routes_map')}
                      </h3>
                    ) : (
                      <div className="flex items-center gap-3 overflow-hidden">
                        {(() => {
                          const r = routes.find(rt => rt.id === selectedRoute);
                          return r ? (
                            <>
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
                                style={{ backgroundColor: r.route_color }}
                              >
                                {r.route_number}
                              </div>
                              <h3 className="text-lg sm:text-lg font-bold text-slate-800 truncate">
                                {r.route_name}
                              </h3>
                            </>
                          ) : (
                            <h3 className="text-xl font-bold text-slate-800">{t('route_info')}</h3>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Google Maps Route Display */}
                <div className="relative flex-1 flex flex-col lg:h-full">
                  <div className="relative flex-1 h-full min-h-[300px] mb-6 rounded-xl overflow-hidden shadow-inner border border-slate-100">
                    {/* Floating Report Button */}
                    <button
                      onClick={() => {
                        window.open(`https://docs.google.com/forms/d/e/1FAIpQLSe-Xaa2r3Xz_13JqXfKk_wYQ3yZqX3X3X3X3X3/viewform?usp=sf_link`, '_blank');
                      }}
                      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 h-9 px-4 bg-orange-400 rounded-full flex items-center justify-center gap-2 text-white shadow-lg hover:bg-orange-500 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                      title={t('report_issue_btn') || '잘못된 정보 신고'}
                    >
                      <AlertTriangle size={16} />
                      <span className="text-xs font-bold whitespace-nowrap">{t('report_issue_btn') || '잘못된 정보 신고'}</span>
                    </button>
                    <GoogleMapsWrapper>
                      <RouteMap
                        routes={routes}
                        stopsByRoute={routeStops}
                        selectedRoute={activeTab === 'search' ? selectedRoute : 'all'}
                        selectedStop={activeTab === 'search' ? selectedStop : null}
                        onStopSelect={(stop) => {
                          if (activeTab === 'search') setSelectedStop(stop);
                        }}
                        highlightedPath={activeTab === 'route' ? currentPath : null}
                        startStop={(activeTab === 'route' && startRoutePoint !== 'current') ? startRoutePoint : null}
                        endStop={activeTab === 'route' ? endRoutePoint : null}
                        onMyLocationClick={() => setIsNearMeOpen(true)}
                        onMapClick={(lat, lng) => {
                          if (selectingRoutePoint) {
                            let nearestStop: Stop | null = null;
                            let minDist = Infinity;

                            allUniqueStops.forEach(stop => {
                              let sLat, sLng;
                              if (stop.location) {
                                const loc = stop.location as any;
                                if (loc.coordinates) { sLng = loc.coordinates[0]; sLat = loc.coordinates[1]; }
                              }

                              if (sLat && sLng) {
                                const dist = calculateDistance({ lat, lng }, { lat: sLat, lng: sLng });
                                if (dist < minDist) {
                                  minDist = dist;
                                  nearestStop = stop;
                                }
                              }
                            });

                            let finalPoint: Stop;

                            if (nearestStop && minDist < 0.1) {
                              finalPoint = nearestStop;
                            } else {
                              finalPoint = {
                                id: `custom_${Date.now()}`,
                                stop_name: t('custom_location' as any) || 'Custom Location',
                                stop_name_en: 'Custom Location',
                                location: { type: 'Point', coordinates: [lng, lat] },
                                schematic_x: null,
                                schematic_y: null,
                                image_url: null,
                                description: null,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                              } as unknown as Stop;
                            }

                            if (selectingRoutePoint === 'start') setStartRoutePoint(finalPoint);
                            else if (selectingRoutePoint === 'end') setEndRoutePoint(finalPoint);

                            setSelectingRoutePoint(null);
                            setActiveTab('route');
                          }
                        }}
                      />
                    </GoogleMapsWrapper>
                  </div>
                </div>
              </div >
            </div >
          </div >
        )
        }
      </div >

      <Footer />



      <BottomSheet
        isOpen={!!selectedStop}
        onClose={() => setSelectedStop(null)}
        title={selectedStop?.stop_name}
      >
        {selectedStop && (
          <div className="space-y-6">
            {selectedStop.stop_name_en && (
              <p className="text-slate-500 -mt-2">{selectedStop.stop_name_en}</p>
            )}

            {selectedStop.image_url && (
              <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-sm">
                <img
                  src={selectedStop.image_url}
                  alt={selectedStop.stop_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {selectedStop.description && (
              <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm leading-relaxed border border-slate-100">
                {selectedStop.description}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  const lat = selectedStop.location
                    ? (selectedStop.location as any).coordinates?.[1]
                    : 17.9757;
                  const lng = selectedStop.location
                    ? (selectedStop.location as any).coordinates?.[0]
                    : 102.6331;
                  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                  window.open(mapsUrl, '_blank');
                }}
                className="flex-1 bg-green-600 text-white py-3.5 rounded-xl hover:bg-green-700 transition-colors font-bold flex items-center justify-center gap-2 shadow-md shadow-green-100"
              >
                <NavigationIcon size={20} />
                {t('directions')}
              </button>

              <button
                onClick={() => {
                  if (isAlarmActive && alarmTargetStop?.id === selectedStop.id) {
                    cancelAlarm();
                    alert(t('alarm_cancelled'));
                  } else {
                    setAlarm(selectedStop);
                    alert(t('alarm_set'));
                  }
                }}
                className={`flex-1 py-3.5 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 shadow-sm ${isAlarmActive && alarmTargetStop?.id === selectedStop.id
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 border border-red-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
              >
                {isAlarmActive && alarmTargetStop?.id === selectedStop.id ? (
                  <>
                    <span>🔕</span>
                    {t('cancel_alarm')}
                  </>
                ) : (
                  <>
                    <span>🔔</span>
                    {t('set_alarm')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      <NearMePanel
        isOpen={isNearMeOpen}
        onClose={() => setIsNearMeOpen(false)}
        userLocation={userLocation}
        stops={allUniqueStops}
        onStopClick={(stop) => {
          setSelectedStop(stop);
          setIsNearMeOpen(false);
        }}
        loadingLocation={locationLoading}
        onRefreshLocation={() => window.location.reload()}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        relatedStop={selectedStop}
        user={user}
      />
    </div >
  );
}
