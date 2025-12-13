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
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import PrivacyPolicyModal from '@/components/legal/PrivacyPolicyModal';
import { MoreVertical, Globe, FileText, Mail, Shield, ChevronRight } from 'lucide-react';

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
  const { t, language, setLanguage } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { location: userLocation, loading: locationLoading, error: locationError, retry: retryLocation, setManualLocation, setLoading: setLocationLoading } = useGeolocation({ autoFetch: false });

  // App Specific State
  // Initialize immediately to prevent header flicker on app launch
  const [isApp, setIsApp] = useState(() => {
    if (typeof window !== 'undefined') {
      return Capacitor.isNativePlatform();
    }
    return false; // Default to Web for SSR
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  // No longer need useEffect for isApp, but can keep listener if platform changes (unlikely)
  // or just trust the initial value. 
  // For safety, we can sync it once on mount just in case.
  useEffect(() => {
    setIsApp(Capacitor.isNativePlatform());

    if (Capacitor.isNativePlatform()) {
      // 1. Force Status Bar to Light Style (Dark Icons)
      StatusBar.setStyle({ style: Style.Light }).catch(e => console.log('StatusBar style error', e));

      // 2. Force WebView to Overlay Status Bar (Edge-to-Edge for All Versions)
      // This unifies behavior: 13/14 will now act like 15 (content starts at top).
      StatusBar.setOverlaysWebView({ overlay: true }).catch(e => console.log('StatusBar overlay error', e));
    }
  }, []);

  const languages = [
    { code: 'ko', flagCode: 'kr', label: '한국어' },
    { code: 'lo', flagCode: 'la', label: 'ລາວ' },
    { code: 'en', flagCode: 'us', label: 'English' },
    { code: 'cn', flagCode: 'cn', label: '中文' },
    { code: 'th', flagCode: 'th', label: 'ไทย' },
    { code: 'vi', flagCode: 'vn', label: 'Tiếng Việt' },
    { code: 'km', flagCode: 'kh', label: 'ខ្មែរ' },
    { code: 'fr', flagCode: 'fr', label: 'Français' },
    { code: 'es', flagCode: 'es', label: 'Español' },
    { code: 'ar', flagCode: 'sa', label: 'العربية' },
    { code: 'jp', flagCode: 'jp', label: '日本語' },
  ] as const;

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
    cancelAlarm,
    currentDistance // Get distance
  } = useStopAlarm({
    userLocation: userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null,
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
    // [UI] Hide Native Splash Screen immediately on mount
    // This allows our custom "React Splash Screen" (splash.png) to be seen while data fetches
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(err => console.error('Error hiding splash:', err));
    }

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

      let apiBase = process.env.NEXT_PUBLIC_API_URL || '';

      // Android 에뮬레이터/운영 환경 분기 처리
      if (!apiBase && Capacitor.getPlatform() === 'android') {
        apiBase = process.env.NODE_ENV === 'development'
          ? 'http://10.0.2.2:3000'
          : 'https://laobus.asia';
      }

      // Remove trailing slash if present to avoid double slashes
      if (apiBase.endsWith('/')) {
        apiBase = apiBase.slice(0, -1);
      }

      // API에서 암호화된 데이터 가져오기
      const response = await fetch(`${apiBase}/api/map-data`);
      if (!response.ok) throw new Error('Failed to fetch map data');

      const { payload } = await response.json();
      const secretKey = await getSecureKeyFromWasm();

      if (!payload) throw new Error('Empty payload received');

      const decryptedData = decryptData(payload, secretKey);
      if (!decryptedData) throw new Error('Decryption failed');

      const { routes: routesData, routeStops: stopsData } = decryptedData;

      if (routesData && stopsData) {
        // Graph will be built by useEffect
      }

      let activeRoutes: Route[] = [];
      if (routesData) {
        // Filter only active routes
        activeRoutes = routesData.filter((r: Route) => r.is_active !== false);
        setRoutes(activeRoutes);
        localStorage.setItem('cached_routes', JSON.stringify(activeRoutes));
      }

      if (stopsData) {
        // Filter stops for active routes only
        const activeRouteIds = new Set(activeRoutes.map(r => r.id));
        const filteredStopsData = Object.keys(stopsData)
          .filter(routeId => activeRouteIds.has(routeId))
          .filter(routeId => activeRouteIds.has(routeId))
          .reduce((obj, key) => {
            // Helper to parse PostGIS EWKB Hex to {lat, lng}
            const parseCoordinates = (hex: string): { lat: number; lng: number } | null => {
              try {
                if (!hex || hex.length < 42) return null;
                // EWKB Hex Format for SRID 4326 (Point):
                // 01 (Endian) + 01000020 (Type) + E6100000 (SRID) = 18 chars header
                // X (8 bytes -> 16 chars) starts at index 18
                // Y (8 bytes -> 16 chars) starts at index 34

                const xHex = hex.substring(18, 34);
                const yHex = hex.substring(34, 50);

                const parseDouble = (hexStr: string) => {
                  const buffer = new ArrayBuffer(8);
                  const view = new DataView(buffer);
                  for (let i = 0; i < 8; i++) {
                    view.setUint8(i, parseInt(hexStr.substring(i * 2, i * 2 + 2), 16));
                  }
                  return view.getFloat64(0, true); // Little endian
                };

                return {
                  lng: parseDouble(xHex),
                  lat: parseDouble(yHex)
                };
              } catch (e) {
                return null;
              }
            };

            const parsedStopsForRoute = stopsData[key].map((stopItem: RouteStopWithDetail) => {
              // Check if location needs parsing
              if (stopItem.stops && typeof stopItem.stops.location === 'string' && (stopItem.stops.location as string).startsWith('01010000')) {
                const parsed = parseCoordinates(stopItem.stops.location as string);
                if (parsed) {
                  (stopItem.stops.location as any) = parsed;
                }
              }
              return stopItem;
            });

            obj[key] = parsedStopsForRoute;
            return obj;
          }, {} as { [key: string]: RouteStopWithDetail[] });

        setRouteStops(filteredStopsData);
        localStorage.setItem('cached_stop_data', JSON.stringify(filteredStopsData));
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      const cachedRoutes = localStorage.getItem('cached_routes');
      const cachedStops = localStorage.getItem('cached_stop_data');

      if (cachedRoutes && cachedStops) {
        const parsedRoutes = JSON.parse(cachedRoutes).filter((r: Route) => r.is_active !== false);
        setRoutes(parsedRoutes);

        const parsedStops = JSON.parse(cachedStops);
        // Also re-filter cached stops just in case cache has stale data
        const activeRouteIds = new Set(parsedRoutes.map((r: Route) => r.id));
        const filteredCachedStops = Object.keys(parsedStops)
          .filter(routeId => activeRouteIds.has(routeId))
          .reduce((obj, key) => {
            obj[key] = parsedStops[key];
            return obj;
          }, {} as { [key: string]: RouteStopWithDetail[] });

        setRouteStops(filteredCachedStops);
        console.log('Loaded data from offline cache');
      }
    } finally {
      setLoading(false);
    }
  };

  // [UI] 3-Phase Loading Logic
  // 1. Native Splash (Hidden immediately on mount)
  // 2. Custom Splash Image (Fixed 3s)
  // 3. Loading UI (If data fetching is slower than 3s)
  const [showIntroSplash, setShowIntroSplash] = useState(true);

  useEffect(() => {
    // 1. Hide Native Splash immediately
    if (Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(e => console.error('Hide splash error', e));
    }

    // 2. Start 3s timer for Custom Splash
    const timer = setTimeout(() => {
      setShowIntroSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (loading || showIntroSplash) {
    // Phase 2 & 3: Unified Splash + Loading Overlay
    // We show this if showIntroSplash is true (first 3s) OR if loading is true.
    // Modified to ALWAYS show the Splash style loading on both Web and App
    // to prevent the "Splash -> Generic Spinner -> Content" transition on Web.
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img src="/splash.webp" alt="Lao Bus" className="w-full h-full object-cover" />
          {/* Optional: Dark overlay to make text readable */}
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* Loading Indicator Overlay */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4 shadow-sm"></div>
          <p className="text-white font-bold text-lg shadow-sm animate-pulse">{t('map_loading_text') || 'Loading...'}</p>
        </div>
      </div>
    );
  }


  return (

    <div
      className="h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col"
      style={{
        paddingTop: isApp ? 'max(env(safe-area-inset-top), 17px)' : 0,
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* Header */}
      {/* Header (Web Only) */}
      {/* Header (Web & App) - Always Show for Branding */}
      {!isApp && (
        <header className="bg-white shadow-md border-b border-slate-200 sticky top-0 z-50 shrink-0" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
          <div className="container mx-auto px-4 py-2 sm:py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1 rounded-md" style={{ backgroundColor: '#2563eb' }}>
                  <svg className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: '#ffffff' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>

                <div>
                  <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-none" style={{ color: '#1e293b' }}>{t('title')}</h1>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 leading-tight mt-0.5" style={{ color: '#64748b', fontWeight: 400 }}>Laos Bus Route Map</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Alarm Status Banner */}
      {isAlarmActive && alarmTargetStop && (
        <div className="bg-blue-600 text-white p-3 text-sm flex items-center justify-between animate-fadeIn px-4 z-20 shrink-0">
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
      <div className="container mx-auto px-0 sm:px-4 py-2 sm:py-4 flex-1 w-full flex flex-col min-h-0 overflow-hidden">
        {routes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center my-auto">
            <div className="text-6xl mb-4">🚍</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('no_routes_title') || 'Routes not found'}</h2>
            <p className="text-slate-600">{t('no_routes_desc') || 'Please add routes in admin panel.'}</p>
          </div>
        ) : (
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6 h-full">
            {/* Right Column: Route Map (Top on Mobile) */}
            <div className="w-full lg:col-span-2 min-h-0 lg:order-2 h-[40vh] lg:h-full shrink-0">
              <div className={`bg-white rounded-xl shadow-lg ${isApp ? 'p-2' : 'p-3 sm:p-6'} h-full flex flex-col`} style={{ border: '1px solid #f8fafc' }}>
                <div className={`flex items-center justify-between ${isApp ? 'mb-1 pb-1' : 'mb-2 pb-2 sm:mb-6 sm:pb-4'} border-b border-slate-200 shrink-0`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <div className="flex-1 flex items-center overflow-hidden">
                    {selectedRoute === 'all' ? (
                      <h3 className={`${isApp ? 'text-sm' : 'text-base lg:text-xl'} font-bold text-slate-800 flex items-center gap-2`} style={{ color: '#1e293b' }}>
                        <MapPin className={`${isApp ? 'w-5 h-5' : 'w-6 h-6'} text-blue-600`} style={{ color: '#2563eb' }} />
                        {t('all_routes_map')}
                      </h3>
                    ) : (
                      <div className="flex items-center gap-3 overflow-hidden">
                        {(() => {
                          const r = routes.find(rt => rt.id === selectedRoute);
                          return r ? (
                            <>
                              <div
                                className={`${isApp ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'} rounded-full flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0`}
                                style={{ backgroundColor: r.route_color, color: '#ffffff' }}
                              >
                                {r.route_number}
                              </div>
                              <h3 className={`${isApp ? 'text-sm' : 'text-base lg:text-xl'} font-bold text-slate-800 truncate`} style={{ color: '#1e293b' }}>
                                {r.route_name}
                              </h3>
                            </>
                          ) : (
                            <h3 className="text-base lg:text-xl font-bold text-slate-800" style={{ color: '#1e293b' }}>{t('route_info')}</h3>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  {/* App Menu Button */}
                  {isApp && (
                    <div className="relative z-50">
                      <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`text-slate-600 hover:text-slate-900 active:bg-slate-100 rounded-full transition-colors ${isApp ? 'p-1 -mr-1' : 'p-2 -mr-2'}`}
                        style={{ color: '#475569' }}
                      >
                        <MoreVertical size={isApp ? 20 : 24} />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-[60]" onClick={() => setIsMenuOpen(false)} />
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-[70] animate-in fade-in zoom-in-95 duration-200">
                            <button
                              onClick={() => {
                                setIsLanguageModalOpen(true);
                                setIsMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                            >
                              <Globe size={18} className="text-blue-500" />
                              <span className="flex-1 text-sm font-medium">{t('language') || 'Language'}</span>
                              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{language.toUpperCase()}</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsPrivacyOpen(true);
                                setIsMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                            >
                              <Shield size={18} className="text-slate-400" />
                              <span className="text-sm">{t('privacy_policy') || 'Privacy Policy'}</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsPrivacyOpen(true);
                                setIsMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                            >
                              <FileText size={18} className="text-slate-400" />
                              <span className="text-sm">{t('terms_of_service') || 'Terms'}</span>
                            </button>

                            <button
                              onClick={() => {
                                window.open('mailto:goldmiru.bada@gmail.com');
                                setIsMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                            >
                              <Mail size={18} className="text-slate-400" />
                              <span className="text-sm">{t('contact_us') || 'Contact'}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Google Maps Route Display */}
                <div className="relative flex-1 flex flex-col lg:h-full">
                  <div className="relative flex-1 h-full min-h-[200px] mb-0 sm:mb-6 rounded-xl overflow-hidden shadow-inner border border-slate-100" style={{ border: '1px solid #e2e8f0' }}>
                    {/* Floating Report Button */}
                    <button
                      onClick={() => {
                        window.open(`https://docs.google.com/forms/d/e/1FAIpQLSe-Xaa2r3Xz_13JqXfKk_wYQ3yZqX3X3X3X3X3/viewform?usp=sf_link`, '_blank');
                      }}
                      className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-10 ${isApp ? 'h-7 px-3' : 'h-9 px-4'} bg-orange-400 rounded-full flex items-center justify-center gap-2 text-white shadow-lg hover:bg-orange-500 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2`}
                      title={t('report_issue_btn') || '잘못된 정보 신고'}
                      style={{ backgroundColor: '#fb923c', color: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                    >
                      <AlertTriangle size={isApp ? 12 : 16} />
                      <span className={`${isApp ? 'text-[10px]' : 'text-xs'} font-bold whitespace-nowrap`}>{t('report_issue_btn') || '잘못된 정보 신고'}</span>
                    </button>
                    {/* Map Selection Instruction Banner */}
                    {selectingRoutePoint && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-slideDown backdrop-blur-sm border border-slate-700/50">
                        <div className={`w-2 h-2 rounded-full ${selectingRoutePoint === 'start' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'}`} />
                        <span className="font-bold text-sm whitespace-nowrap">
                          {selectingRoutePoint === 'start'
                            ? (t('select_start_on_map') || '지도에서 출발지를 선택해주세요')
                            : (t('select_end_on_map') || '지도에서 도착지를 선택해주세요')}
                        </span>
                        <button
                          onClick={() => setSelectingRoutePoint(null)}
                          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Alarm Active Banner (Visual Debug) */}
                    {isAlarmActive && alarmTargetStop && (
                      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-pulse border-2 border-white/30">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] opacity-90">하차 알림 활성화</span>
                          <span className="font-bold whitespace-nowrap text-lg">
                            {currentDistance ? (currentDistance >= 1000 ? `${(currentDistance / 1000).toFixed(1)}km` : `${currentDistance}m`) : '거리 계산 중...'}
                          </span>
                        </div>
                        <button
                          onClick={cancelAlarm}
                          className="ml-2 bg-white/20 p-1 rounded-full hover:bg-white/30"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    <GoogleMapsWrapper>
                      <RouteMap
                        isApp={isApp}
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
                        onLocationLoading={setLocationLoading}
                        onLocationFound={(pos) => {
                          if (setManualLocation) {
                            setManualLocation(pos.lat, pos.lng);
                          }
                        }}
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

            {/* Left Column: Tabs (Bottom on Mobile) */}
            <div className="w-full lg:col-span-1 min-h-0 lg:order-1 flex-1 lg:h-full overflow-hidden">
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
                alarmTargetStop={alarmTargetStop}
                isAlarmActive={isAlarmActive}
              />
            </div>
          </div >
        )
        }
      </div >

      {!isApp && <Footer />}

      {
        isApp && (
          <>
            {/* Mobile Language Selection Modal */}
            {isLanguageModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsLanguageModalOpen(false)} />
                <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden shadow-2xl relative z-[101] flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">{t('language') || 'Select Language'}</h3>
                    <button onClick={() => setIsLanguageModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                      <X size={20} className="text-slate-500" />
                    </button>
                  </div>
                  <div className="overflow-y-auto p-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as any);
                          setIsLanguageModalOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-4 transition-colors ${language === lang.code
                          ? 'bg-blue-50 border border-blue-100'
                          : 'hover:bg-slate-50 border border-transparent'
                          }`}
                      >
                        <img
                          src={`https://flagcdn.com/w40/${lang.flagCode}.png`}
                          alt={lang.label}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm"
                        />
                        <div className="flex-1">
                          <span className={`block font-bold ${language === lang.code ? 'text-blue-700' : 'text-slate-700'}`}>{lang.label}</span>
                        </div>
                        {language === lang.code && (
                          <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <PrivacyPolicyModal
              isOpen={isPrivacyOpen}
              onClose={() => setIsPrivacyOpen(false)}
            />
          </>
        )
      }



      <BottomSheet
        isOpen={!!selectedStop}
        onClose={() => setSelectedStop(null)}
        title={
          selectedRoute !== 'all' ? (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: routes.find(r => r.id === selectedRoute)?.route_color || '#94a3b8' }}
              >
                {routes.find(r => r.id === selectedRoute)?.route_number}
              </div>
              <span>{selectedStop?.stop_name}</span>
            </div>
          ) : (
            selectedStop?.stop_name
          )
        }
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
                  let lat = 17.9757;
                  let lng = 102.6331;

                  if (selectedStop.location) {
                    const loc = selectedStop.location as any;
                    // Handle GeoJSON format { type: 'Point', coordinates: [lng, lat] }
                    if (loc.coordinates && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
                      lng = loc.coordinates[0];
                      lat = loc.coordinates[1];
                    }
                    // Handle simple object format { lat, lng } or { latitude, longitude }
                    else if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                      lat = loc.lat;
                      lng = loc.lng;
                    }
                  }

                  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                  window.open(mapsUrl, '_blank');
                }}
                className="flex-1 bg-green-600 text-white py-1.5 text-sm rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 shadow-md shadow-green-100"
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
                className={`flex-1 py-1.5 text-sm rounded-xl transition-colors font-medium flex items-center justify-center gap-2 shadow-sm ${isAlarmActive && alarmTargetStop?.id === selectedStop.id
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

              <button
                onClick={() => {
                  setEndRoutePoint(selectedStop);
                  setActiveTab('route');
                  setSelectedStop(null);
                }}
                className="flex-1 bg-blue-600 text-white py-1.5 text-sm rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 shadow-md shadow-blue-100"
              >
                <NavigationIcon size={20} />
                {t('find_route')}
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
        locationError={locationError}
        onRefreshLocation={() => retryLocation && retryLocation()}
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
