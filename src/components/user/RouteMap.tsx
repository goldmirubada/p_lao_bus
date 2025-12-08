'use client';

import { useEffect, useRef, useState } from 'react';
import { Route, Stop } from '@/lib/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';

// Type declaration for Google Maps
declare global {
    interface Window {
        google: any;
    }
}

interface RouteMapProps {
    routes: Route[];
    stopsByRoute: {
        [routeId: string]: {
            stops: Stop;
            path_coordinates?: { lat: number; lng: number }[];
        }[];
    };
    selectableStops?: Stop[];
    onStopSelect?: (stopId: string) => void;
    onMyLocationClick?: () => void;
}

const DEFAULT_STOPS: Stop[] = [];

export default function RouteMap({ routes, stopsByRoute, selectableStops = DEFAULT_STOPS, onStopSelect, onMyLocationClick }: RouteMapProps) {
    const { t } = useLanguage();
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const userMarkerRef = useRef<google.maps.Marker | null>(null);
    const userPulseMarkerRef = useRef<google.maps.Marker | null>(null);
    const [mounted, setMounted] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const selectableMarkersRef = useRef<google.maps.Marker[]>([]);
    const polylinesRef = useRef<google.maps.Polyline[]>([]);
    const boundsRef = useRef<string>('');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Get user location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };
                    setUserLocation(pos);

                    // Center map on user location if map is initialized
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.setCenter(pos);
                        mapInstanceRef.current.setZoom(15);
                    }
                },
                () => {
                    console.log('Error: The Geolocation service failed.');
                }
            );
        }
    }, []);

    // Initialize Map
    useEffect(() => {
        const initMap = async () => {
            if (!mounted || !mapRef.current || !window.google) return;

            if (!mapInstanceRef.current) {
                const { Map } = await google.maps.importLibrary("maps") as any;

                const map = new Map(mapRef.current, {
                    center: { lat: 17.9757, lng: 102.6331 }, // Default Vientiane
                    zoom: 13,
                    mapTypeControl: false,
                    streetViewControl: false,
                    gestureHandling: 'greedy', // Allow zooming without CTRL key
                });
                mapInstanceRef.current = map;
                setMapReady(true);
            }
        };
        initMap();
    }, [mounted]);

    // Handle User Marker
    useEffect(() => {
        const updateUserMarker = async () => {
            if (!mapReady || !mapInstanceRef.current || !window.google || !userLocation) return;

            const { Marker } = await google.maps.importLibrary("marker") as any;

            if (!userMarkerRef.current) {
                userMarkerRef.current = new Marker({
                    position: userLocation,
                    map: mapInstanceRef.current,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: '#3b82f6', // Blue-500
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                    title: t('my_location'),
                    zIndex: 100
                });

                // Add a pulse effect circle
                userPulseMarkerRef.current = new Marker({
                    position: userLocation,
                    map: mapInstanceRef.current,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 16,
                        fillColor: '#3b82f6',
                        fillOpacity: 0.2,
                        strokeColor: '#3b82f6',
                        strokeOpacity: 0.2,
                        strokeWeight: 1,
                    },
                    zIndex: 99
                });
            } else {
                userMarkerRef.current.setPosition(userLocation);
                if (userPulseMarkerRef.current) {
                    userPulseMarkerRef.current.setPosition(userLocation);
                }
            }
        };
        updateUserMarker();
    }, [userLocation, mounted, mapReady]);

    // Handle Routes and Stops
    useEffect(() => {
        const renderMapObjects = async () => {
            if (!mapReady || !mapInstanceRef.current || !window.google) return;

            // Load necessary libraries
            const { Marker } = await google.maps.importLibrary("marker") as any;
            const { Polyline } = await google.maps.importLibrary("maps") as any;
            const { LatLngBounds } = await google.maps.importLibrary("core") as any;
            const { InfoWindow } = await google.maps.importLibrary("maps") as any;

            // Clear existing markers and polylines
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];
            selectableMarkersRef.current.forEach(marker => marker.setMap(null));
            selectableMarkersRef.current = [];
            polylinesRef.current.forEach(polyline => polyline.setMap(null));
            polylinesRef.current = [];

            // 1. Render Selectable Stops
            if (selectableStops.length > 0) {
                selectableStops.forEach(stop => {
                    let lat: number | null = null;
                    let lng: number | null = null;

                    if (stop.location) {
                        // Type assertion for flexibility since location can be string or object depending on serialization
                        const loc = stop.location as any;
                        if (loc.coordinates && Array.isArray(loc.coordinates)) {
                            lng = loc.coordinates[0];
                            lat = loc.coordinates[1];
                        } else if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                            lat = loc.lat;
                            lng = loc.lng;
                        }
                    } else if (typeof (stop as any).lat === 'number' && typeof (stop as any).lng === 'number') {
                        lat = (stop as any).lat;
                        lng = (stop as any).lng;
                    }

                    if (lat !== null && lng !== null) {
                        const marker = new Marker({
                            position: { lat, lng },
                            map: mapInstanceRef.current,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 6,
                                fillColor: '#334155', // Slate-700
                                fillOpacity: 0.9,
                                strokeColor: '#ffffff',
                                strokeWeight: 2,
                            },
                            title: stop.stop_name,
                            zIndex: 1
                        });

                        if (onStopSelect) {
                            marker.addListener('click', () => {
                                onStopSelect(stop.id);
                            });
                        }

                        selectableMarkersRef.current.push(marker);
                    }
                });
            }

            // 2. Render Routes
            if (routes.length === 0 && selectableStops.length === 0) {
                return;
            }

            const bounds = new LatLngBounds();
            let hasRoutePoints = false;

            routes.forEach(route => {
                const stops = stopsByRoute[route.id] || [];
                if (stops.length === 0) return;

                const pathCoordinates: google.maps.LatLngLiteral[] = [];

                stops.forEach((rs, index) => {
                    const stop = rs.stops;
                    let lat: number | null = null;
                    let lng: number | null = null;

                    if (stop.location) {
                        const loc = stop.location as any;
                        if (loc.coordinates && Array.isArray(loc.coordinates)) {
                            lng = loc.coordinates[0];
                            lat = loc.coordinates[1];
                        } else if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                            lat = loc.lat;
                            lng = loc.lng;
                        }
                    } else if (typeof (stop as any).lat === 'number' && typeof (stop as any).lng === 'number') {
                        lat = (stop as any).lat;
                        lng = (stop as any).lng;
                    }

                    if (lat !== null && lng !== null) {
                        const position = { lat, lng };
                        pathCoordinates.push(position);
                        bounds.extend(position);
                        hasRoutePoints = true;

                        // Add path coordinates (waypoints)
                        if (rs.path_coordinates && Array.isArray(rs.path_coordinates)) {
                            rs.path_coordinates.forEach(coord => {
                                pathCoordinates.push(coord);
                                bounds.extend(coord);
                            });
                        }

                        // Create Marker
                        const marker = new Marker({
                            position: position,
                            map: mapInstanceRef.current,
                            label: {
                                text: `${index + 1}`,
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '10px'
                            },
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 10,
                                fillColor: route.route_color,
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 2,
                            },
                            title: `${route.route_number}: ${stop.stop_name}`,
                            zIndex: 10
                        });

                        const infoWindow = new InfoWindow({
                            content: `
                                <div style="padding: 8px;">
                                    <div style="font-size: 12px; color: #64748b; margin-bottom: 2px;">${route.route_number}</div>
                                    <strong style="font-size: 14px; color: #1e293b;">${stop.stop_name}</strong>
                                    ${stop.stop_name_en ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">${stop.stop_name_en}</div>` : ''}
                                </div>
                            `
                        });

                        marker.addListener('click', () => {
                            infoWindow.open(mapInstanceRef.current, marker);
                        });

                        markersRef.current.push(marker);
                    }
                });

                // Create Polyline
                if (pathCoordinates.length > 0) {
                    const polyline = new Polyline({
                        path: pathCoordinates,
                        geodesic: true,
                        strokeColor: route.route_color,
                        strokeOpacity: 0.8,
                        strokeWeight: 4,
                        map: mapInstanceRef.current,
                        icons: [{
                            icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                            offset: '100%',
                            repeat: '100px'
                        }]
                    });
                    polylinesRef.current.push(polyline);
                }
            });

            // Add selectable stops to bounds if no route points
            if (!hasRoutePoints && selectableMarkersRef.current.length > 0) {
                selectableMarkersRef.current.forEach(marker => {
                    const pos = marker.getPosition();
                    if (pos) bounds.extend(pos);
                });
            }

            // Generate a unique signature for the current routes to avoid redundant re-fits
            const currentRoutesId = routes.map(r => r.id).sort().join(',');

            // Only fit bounds if the route set has actually changed
            if (boundsRef.current !== currentRoutesId && !bounds.isEmpty()) {
                mapInstanceRef.current.fitBounds(bounds);
                boundsRef.current = currentRoutesId;
            }
        };
        renderMapObjects();

    }, [routes, stopsByRoute, selectableStops, mounted, mapReady]);

    const handleMyLocationClick = () => {
        if (!navigator.geolocation) {
            alert('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 15000, // Increased to 15s
            maximumAge: 30000 // Allow cached position up to 30s
        };

        const success = (position: GeolocationPosition) => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            setUserLocation(pos);
            if (mapInstanceRef.current) {
                console.log('Moving map to user location:', pos);
                mapInstanceRef.current.setCenter(pos);
                mapInstanceRef.current.setZoom(17);
            }
        };

        const error = (err: GeolocationPositionError) => {
            console.warn('Geolocation error:', err);
            let message = '위치 정보를 가져올 수 없습니다.';
            switch (err.code) {
                case err.PERMISSION_DENIED:
                    message = '위치 정보 제공이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.';
                    break;
                case err.POSITION_UNAVAILABLE:
                    message = '위치 정보를 사용할 수 없습니다.';
                    break;
                case err.TIMEOUT:
                    message = '위치 정보 요청 시간이 초과되었습니다.';
                    break;
            }
            alert(message);
        };

        navigator.geolocation.getCurrentPosition(success, error, options);
        if (onMyLocationClick) onMyLocationClick();
    };

    if (!mounted) {
        return <div className="w-full h-96 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />;
    }

    return (
        <div className="w-full h-96 rounded-xl border border-slate-200 overflow-hidden shadow-md relative">
            <div ref={mapRef} className="w-full h-full" />

            {/* My Location Button */}
            <button
                onClick={handleMyLocationClick}
                className="absolute bottom-24 right-4 bg-white p-3 rounded-full shadow-lg hover:bg-slate-50 transition-colors z-10 text-slate-700"
                title={t('my_location')}
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
        </div>
    );
}
