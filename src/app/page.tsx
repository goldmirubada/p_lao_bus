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
import Search from '@/components/user/Search';
import BottomSheet from '@/components/shared/BottomSheet';
import LoginButton from '@/components/auth/LoginButton';
import FeedbackModal from '@/components/user/FeedbackModal';
import { ROUTE_FARES, formatFare } from '@/constants/fares';
import Footer from '@/components/layout/Footer';
import { NetworkGraph } from '@/lib/graph/NetworkGraph';
import { PathResult } from '@/lib/graph/types';
import RouteFindingPanel from '@/components/user/RouteFindingPanel';
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
  const [isRouteFinderOpen, setIsRouteFinderOpen] = useState(false); // Route Finder State
  const [startRoutePoint, setStartRoutePoint] = useState<Stop | 'current'>('current');
  const [endRoutePoint, setEndRoutePoint] = useState<Stop | null>(null);
  const [currentPath, setCurrentPath] = useState<PathResult | null>(null); // Path Result State

  // Route Finding Map Selection
  const [selectingRoutePoint, setSelectingRoutePoint] = useState<'start' | 'end' | null>(null);
  const [mapSelectedStop, setMapSelectedStop] = useState<Stop | null>(null);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [user, setUser] = useState<any>(null); // For auth check

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { location: userLocation, loading: locationLoading, error: locationError } = useGeolocation();

  // Initialize Graph Engine
  const graphEngine = useMemo(() => new NetworkGraph(), []);

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

      // Fetch Encrypted Map Data
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiBase}/api/map-data`, { cache: 'no-store' });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Details:', errorData);
        throw new Error(errorData.details || `API Error: ${response.status}`);
      }

      const { payload } = await response.json();
      if (!payload) throw new Error('No payload received');

      // 1. Get Secret Key
      let secretKey = '';
      try {
        secretKey = await getSecureKeyFromWasm();
      } catch (e) {
        console.error('WASM Load Failed', e);
        throw new Error('Security Module Error');
      }

      // 2. Decrypt
      const decryptedData = decryptData(payload, secretKey);
      if (!decryptedData) throw new Error('Decryption failed');

      const { routes: routesData, routeStops: stopsData } = decryptedData;

      // Build Graph
      if (routesData && stopsData) {
        console.time('GraphBuild');
        graphEngine.buildGraph(routesData, stopsData);
        console.timeEnd('GraphBuild');
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
      // Offline Support: Load from localStorage on error
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
          <p className="text-slate-600 font-medium">{t('map_loading_text') || '노선도 로딩 중...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col">
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
              <button
                onClick={() => setIsRouteFinderOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
              >
                <CarFront size={18} />
                <span className="hidden sm:inline">{t('find_route') || "길찾기"}</span>
              </button>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Alarm Status Banner - Placed below header */}
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
      <div className="container mx-auto px-4 py-8 flex-1">
        {routes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🚌</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('no_routes_title') || '노선 정보가 없습니다'}</h2>
            <p className="text-slate-600">{t('no_routes_desc') || '관리자 페이지에서 노선을 추가해주세요.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Column: Route Selection */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24 z-10">
                {/* Search Component */}
                <Search
                  routes={routes}
                  stops={allUniqueStops}
                  onRouteSelect={(routeId) => setSelectedRoute(routeId)}
                  onStopSelect={(stop) => {
                    setSelectedStop(stop);
                    setIsNearMeOpen(false);
                  }}
                />

                <div className="flex items-center justify-between mb-4 mt-6">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                    {selectedRoute === 'all' ? t('all_routes_map') : t('route_info')}
                  </h2>
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${showFavoritesOnly
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    <Star size={16} fill={showFavoritesOnly ? "currentColor" : "none"} />
                    {t('favorites')}
                  </button>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-blue-400 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {selectedRoute === 'all' ? (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold">
                          ALL
                        </div>
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                          style={{ backgroundColor: routes.find(r => r.id === selectedRoute)?.route_color }}
                        >
                          {routes.find(r => r.id === selectedRoute)?.route_number}
                        </div>
                      )}
                      <span className="font-bold text-lg text-slate-700">
                        {selectedRoute === 'all' ? t('view_all_routes') : routes.find(r => r.id === selectedRoute)?.route_name}
                      </span>
                    </div>
                    <svg
                      className={`w-6 h-6 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto animate-fadeIn">
                      <button
                        onClick={() => {
                          setSelectedRoute('all');
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 ${selectedRoute === 'all' ? 'bg-blue-50' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold">
                          ALL
                        </div>
                        <span className={`font-medium ${selectedRoute === 'all' ? 'text-blue-700' : 'text-slate-700'}`}>
                          {t('view_all_routes')}
                        </span>
                      </button>

                      {displayedRoutes.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          {showFavoritesOnly ? t('no_favorites') : t('no_route_info')}
                          {showFavoritesOnly && <div className="text-xs mt-2 text-slate-400">{t('add_favorite_hint')}</div>}
                        </div>
                      ) : (
                        displayedRoutes.map(route => (
                          <div
                            key={route.id}
                            className={`w-full flex items-center gap-3 border-b border-slate-50 last:border-0 ${selectedRoute === route.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(route.id);
                              }}
                              className="p-4 pr-1 text-slate-400 hover:text-yellow-500 focus:outline-none"
                            >
                              <Star size={20} fill={isFavorite(route.id) ? "#eab308" : "none"} className={isFavorite(route.id) ? "text-yellow-500" : ""} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRoute(route.id);
                                setIsDropdownOpen(false);
                              }}
                              className="flex-1 p-4 pl-1 flex items-center gap-3 text-left"
                            >
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                                style={{ backgroundColor: route.route_color }}
                              >
                                {route.route_number}
                              </div>
                              <div className="text-left">
                                <div className={`font-medium ${selectedRoute === route.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                  {route.route_name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {route.route_number}
                                </div>
                              </div>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Route Info (if single route selected) */}
                {selectedRoute && selectedRoute !== 'all' && (
                  <div className="mt-6 animate-fadeIn">
                    {(() => {
                      const route = routes.find(r => r.id === selectedRoute);
                      if (!route) return null;
                      return (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-sm"
                              style={{ backgroundColor: route.route_color }}
                            >
                              {route.route_number}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-slate-800 text-lg">{route.route_name}</div>
                                <button
                                  onClick={() => toggleFavorite(route.id)}
                                  className="p-1 text-slate-400 hover:text-yellow-500 focus:outline-none transition-colors"
                                >
                                  <Star size={24} fill={isFavorite(route.id) ? "#eab308" : "none"} className={isFavorite(route.id) ? "text-yellow-500" : ""} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {route.description || t('no_description')}
                          </p>
                          <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-500 flex justify-between">
                            <span>{t('total_stops')}</span>
                            <span className="font-bold text-slate-700">{routeStops[route.id]?.length || 0}개</span>
                          </div>
                          {/* Fare Info */}
                          <div className="mt-2 pt-2 border-t border-slate-200 text-sm text-slate-500 flex justify-between">
                            <span>{t('fare')}</span>
                            <span className="font-bold text-blue-600">
                              {formatFare(ROUTE_FARES[route.route_number] || ROUTE_FARES['default'])}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Route Map */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 shrink-0">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <MapPin className="text-blue-600" />
                    {selectedRoute === 'all' ? t('all_routes_map') : t('route_info')}
                  </h3>

                  <button
                    onClick={async () => {
                      if (!user) {
                        const doLogin = confirm(t('login_required_confirm') || '제보하기 위해서는 로그인이 필요합니다.\n구글로 로그인하시겠습니까?');
                        if (doLogin) {
                          await supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                              redirectTo: `${window.location.origin}/auth/callback`,
                            },
                          });
                        }
                        return;
                      }
                      setIsFeedbackOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-full text-xs font-bold transition-colors border border-red-100"
                  >
                    <AlertTriangle size={14} />
                    {t('report_issue_btn') || '잘못된 정보 신고'}
                  </button>
                </div>

                {/* Google Maps Route Display */}
                <div className="relative flex-1 min-h-[400px] mb-6 rounded-xl overflow-hidden shadow-inner border border-slate-100">
                  {/* Map Selection Banner */}
                  {selectingRoutePoint && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg z-[60] animate-bounce flex items-center gap-2">
                      <MapPin size={16} className="text-yellow-400" />
                      <span className="font-bold text-sm">
                        {selectingRoutePoint === 'start'
                          ? (t('select_start_on_map' as any) || 'Select Start')
                          : (t('select_end_on_map' as any) || 'Select End')}
                      </span>
                      <button
                        onClick={() => setSelectingRoutePoint(null)}
                        className="ml-2 bg-white/20 hover:bg-white/30 rounded-full p-0.5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Main Content */}
                  <div className="relative w-full h-full">
                    <GoogleMapsWrapper>
                      <RouteMap
                        routes={filteredRoutes}
                        stopsByRoute={routeStops}
                        highlightedPath={currentPath}
                        onStopSelect={(stopId) => {
                          // Find the stop object
                          let foundStop: Stop | null = null;
                          Object.values(routeStops).flat().forEach(rs => {
                            if (rs.stops.id === stopId) foundStop = rs.stops;
                          });

                          if (foundStop) {
                            if (selectingRoutePoint === 'start') {
                              setStartRoutePoint(foundStop);
                              setSelectingRoutePoint(null);
                              setIsRouteFinderOpen(true);
                            } else if (selectingRoutePoint === 'end') {
                              setEndRoutePoint(foundStop);
                              setSelectingRoutePoint(null);
                              setIsRouteFinderOpen(true);
                            } else {
                              // Normal Stop Selection
                              setSelectedStop(foundStop);
                            }
                          }
                        }}
                        onMyLocationClick={() => setIsNearMeOpen(true)}
                        onMapClick={(lat, lng) => {
                          if (selectingRoutePoint) {
                            // Find nearest stop
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

                            // Threshold: 100m (0.1km)
                            if (nearestStop && minDist < 0.1) {
                              finalPoint = nearestStop;
                            } else {
                              // Create Custom Location
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
                            setIsRouteFinderOpen(true);
                          }
                        }}
                        startStop={startRoutePoint === 'current' ? null : startRoutePoint}
                        endStop={endRoutePoint}
                      />
                    </GoogleMapsWrapper>
                  </div>
                </div>

                {/* Schematic Route Display (Only for single route) */}
                {selectedRoute !== 'all' && (
                  <div className="relative flex-1 overflow-y-auto max-h-[500px]">
                    {(() => {
                      const route = routes.find(r => r.id === selectedRoute);
                      const stops = routeStops[selectedRoute!] || [];

                      if (stops.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-500">
                            {t('no_stops_in_route')}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-0">
                          {stops.map((rs, index) => (
                            <div key={rs.id} className="relative flex items-center">
                              {/* Vertical Line */}
                              {index < stops.length - 1 && (
                                <div
                                  className="absolute left-6 top-12 w-1 h-full -z-10"
                                  style={{ backgroundColor: route?.route_color }}
                                ></div>
                              )}

                              {/* Stop Item */}
                              <button
                                onClick={() => setSelectedStop(rs.stops)}
                                className="flex items-center gap-4 p-4 w-full hover:bg-slate-50 rounded-lg transition-colors group"
                              >
                                {/* Stop Circle */}
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 ring-4 ring-white"
                                  style={{ backgroundColor: route?.route_color }}
                                >
                                  {index + 1}
                                </div>

                                {/* Stop Info */}
                                <div className="flex-1 text-left">
                                  <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                    {rs.stops?.stop_name}
                                  </div>
                                  {rs.stops?.stop_name_en && (
                                    <div className="text-sm text-slate-500">
                                      {rs.stops.stop_name_en}
                                    </div>
                                  )}
                                </div>

                                {/* Info Icon */}
                                <Info size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />

      {/* Stop Detail Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedStop}
        onClose={() => setSelectedStop(null)}
        title={selectedStop?.stop_name}
      >
        {selectedStop && (
          <div className="space-y-6">
            {/* English Name */}
            {selectedStop.stop_name_en && (
              <p className="text-slate-500 -mt-2">{selectedStop.stop_name_en}</p>
            )}

            {/* Image */}
            {selectedStop.image_url && (
              <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-sm">
                <img
                  src={selectedStop.image_url}
                  alt={selectedStop.stop_name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Description */}
            {selectedStop.description && (
              <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm leading-relaxed border border-slate-100">
                {selectedStop.description}
              </div>
            )}

            {/* Action Buttons */}
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

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        relatedStop={selectedStop}
        user={user}
      />

      {/* Route Finding Panel */}
      <RouteFindingPanel
        isOpen={isRouteFinderOpen}
        onClose={() => {
          setIsRouteFinderOpen(false);
          setSelectingRoutePoint(null);
        }}
        userLocation={userLocation as any}
        stops={allUniqueStops}
        graphEngine={graphEngine}
        onPathFound={(path) => setCurrentPath(path)}
        onSelectOnMap={(type) => setSelectingRoutePoint(type)}
        selectingType={selectingRoutePoint}
        startPoint={startRoutePoint}
        setStartPoint={setStartRoutePoint}
        endPoint={endRoutePoint}
        setEndPoint={setEndRoutePoint}
      />
    </div>
  );
}
