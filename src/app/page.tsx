'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Route, Stop, RouteStop } from '@/lib/supabase/types';
import { MapPin, Navigation as NavigationIcon, Info } from 'lucide-react';
import GoogleMapsWrapper from '@/components/admin/GoogleMapsWrapper';
import RouteMap from '@/components/user/RouteMap';

type RouteStopWithDetail = RouteStop & {
  stops: Stop;
};

export default function SchematicMap() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeStops, setRouteStops] = useState<{ [key: string]: RouteStopWithDetail[] }>({});
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

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
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
                <h1 className="text-2xl font-bold text-slate-800">라오스 버스 노선도</h1>
                <p className="text-sm text-slate-500">Laos Bus Route Map</p>
              </div>
            </div>
            <a
              href="/admin/dashboard"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              관리자
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {routes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🚌</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">노선 정보가 없습니다</h2>
            <p className="text-slate-600">관리자 페이지에서 노선을 추가해주세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Route List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                  운행 노선
                </h2>
                <div className="space-y-2">
                  {routes.map((route) => (
                    <button
                      key={route.id}
                      onClick={() => setSelectedRoute(route.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedRoute === route.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shadow-md"
                          style={{ backgroundColor: route.route_color }}
                        >
                          {route.route_number}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{route.route_name}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {routeStops[route.id]?.length || 0}개 정류장
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Route Map */}
            <div className="lg:col-span-2">
              {selectedRoute ? (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  {(() => {
                    const route = routes.find(r => r.id === selectedRoute);
                    const stops = routeStops[selectedRoute] || [];

                    return (
                      <>
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                          <div
                            className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
                            style={{ backgroundColor: route?.route_color }}
                          >
                            {route?.route_number}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800">{route?.route_name}</h3>
                            <p className="text-sm text-slate-500">{route?.description}</p>
                          </div>
                        </div>

                        {/* Google Maps Route Display */}
                        {stops.length > 0 && route && (
                          <div className="mb-6">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                              <MapPin size={16} className="text-blue-600" />
                              노선 지도
                            </h4>
                            <GoogleMapsWrapper>
                              <RouteMap route={route} stops={stops} />
                            </GoogleMapsWrapper>
                          </div>
                        )}

                        {/* Schematic Route Display */}
                        <div className="relative">
                          {stops.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                              이 노선에 등록된 정류장이 없습니다.
                            </div>
                          ) : (
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
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">노선을 선택하세요</h3>
                  <p className="text-slate-600">왼쪽 목록에서 노선을 클릭하면 정류장을 볼 수 있습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stop Detail Modal */}
      {selectedStop && (
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
                길찾기
              </button>
              <button
                onClick={() => setSelectedStop(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
