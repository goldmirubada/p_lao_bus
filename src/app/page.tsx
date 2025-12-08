'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Route, Stop, RouteStop } from '@/lib/supabase/types';
import { MapPin, Navigation as NavigationIcon, Info, Star } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useMemo } from 'react';
import GoogleMapsWrapper from '@/components/admin/GoogleMapsWrapper';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useStopAlarm } from '@/hooks/useStopAlarm';
import NearMePanel from '@/components/user/NearMePanel';
import { ROUTE_FARES, formatFare } from '@/constants/fares';

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

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { location: userLocation, loading: locationLoading } = useGeolocation();

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

  const displayedRoutes = showFavoritesOnly
    ? routes.filter(r => isFavorite(r.id))
    : routes;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch routes
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .order('route_number');

      if (routesError) throw routesError;

      setRoutes(routesData || []);

      // Offline Support: Save routes to localStorage
      if (routesData) {
        localStorage.setItem('cached_routes', JSON.stringify(routesData));
      }

      // Fetch route stops for each route
      if (routesData) {
        const stopsData: { [key: string]: RouteStopWithDetail[] } = {};

        for (const route of routesData) {
          const { data, error } = await supabase
            .from('route_stops')
            .select('*, stops(*)')
            .eq('route_id', route.id)
            .order('sequence_order');

          if (!error && data) {
            // Fetch coordinates for each stop using RPC
            const stopsWithCoords = await Promise.all(
              data.map(async (rs: any) => {
                const { data: coordData } = await supabase
                  .rpc('get_stop_coordinates', { stop_id: rs.stops.id });

                if (coordData && coordData.length > 0) {
                  // Add GeoJSON-formatted location
                  rs.stops.location = {
                    type: 'Point',
                    coordinates: [coordData[0].lng, coordData[0].lat]
                  };
                }
                return rs;
              })
            );

            // @ts-ignore
            stopsData[route.id] = stopsWithCoords;
          }
        }

        setRouteStops(stopsData);
        // Offline Support: Save stops to localStorage
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
          <p className="text-slate-600 font-medium">노선도 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-slate-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
                <p className="text-sm text-slate-500">Laos Bus Route Map</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header >

      {/* Alarm Status Banner */}
      {isAlarmActive && alarmTargetStop && (
        <div className="bg-blue-600 text-white p-3 text-sm flex items-center justify-between animate-fadeIn px-4">
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

      {/* Main Content */}
      < div className="container mx-auto px-4 py-8" >
        {
          routes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">🚌</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">노선 정보가 없습니다</h2>
              <p className="text-slate-600">관리자 페이지에서 노선을 추가해주세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Route Selection */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6 z-20">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                      {t('select_route')}
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

              {/* Right: Route Map */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <MapPin className="text-blue-600" />
                      {selectedRoute === 'all' ? '전체 노선도' : '노선 상세 정보'}
                    </h3>
                  </div>

                  {/* Google Maps Route Display */}
                  <div className="mb-6">
                    <GoogleMapsWrapper>
                      <RouteMap
                        routes={selectedRoute === 'all' ? routes : routes.filter(r => r.id === selectedRoute)}
                        stopsByRoute={routeStops}
                        onStopSelect={(stopId) => {
                          // Find the stop object from all stops
                          // We need to search through all routeStops
                          let foundStop: Stop | null = null;
                          Object.values(routeStops).flat().forEach(rs => {
                            if (rs.stops.id === stopId) foundStop = rs.stops;
                          });
                          if (foundStop) setSelectedStop(foundStop);
                        }}
                        onMyLocationClick={() => setIsNearMeOpen(true)}
                      />
                    </GoogleMapsWrapper>
                  </div>

                  {/* Schematic Route Display (Only for single route) */}
                  {selectedRoute !== 'all' && (
                    <div className="relative">
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
          )
        }
      </div >

      {/* Stop Detail Modal */}
      {
        selectedStop && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedStop(null)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedStop.stop_name}</h3>
                  {selectedStop.stop_name_en && (
                    <p className="text-sm text-slate-500 mt-1">{selectedStop.stop_name_en}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedStop(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedStop.image_url && (
                <img
                  src={selectedStop.image_url}
                  alt={selectedStop.stop_name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}

              {selectedStop.description && (
                <p className="text-slate-600 mb-4">{selectedStop.description}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Extract lat/lng from PostGIS geography format
                    // Format: POINT(lng lat)
                    // We'll use the stored location to get coordinates
                    const lat = selectedStop.location
                      ? (selectedStop.location as any).coordinates?.[1]
                      : 17.9757; // Default to Vientiane
                    const lng = selectedStop.location
                      ? (selectedStop.location as any).coordinates?.[0]
                      : 102.6331;

                    // Open Google Maps with directions
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                    window.open(mapsUrl, '_blank');
                  }}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <NavigationIcon size={20} />
                  {t('directions')}
                </button>

                <div className="flex-1 flex gap-2">
                  {/* Alarm Button */}
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
                    className={`flex-1 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${isAlarmActive && alarmTargetStop?.id === selectedStop.id
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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

                  <button
                    onClick={() => setSelectedStop(null)}
                    className="bg-slate-100 text-slate-700 w-12 rounded-lg hover:bg-slate-200 transition-colors font-medium flex items-center justify-center"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

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
    </div >
  );
}
