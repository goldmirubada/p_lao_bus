'use client';

import { useEffect, useRef, useState } from 'react';
import { Route, Stop } from '@/lib/supabase/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { PathResult } from '@/lib/graph/types';

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
    onMapClick?: (lat: number, lng: number) => void;
    highlightedPath?: PathResult | null;
    startStop?: Stop | null;
    endStop?: Stop | null;
}

const DEFAULT_STOPS: Stop[] = [];

export default function RouteMap({
    routes,
    stopsByRoute,
    selectableStops = DEFAULT_STOPS,
    onStopSelect,
    onMyLocationClick,
    onMapClick,
    highlightedPath,
    startStop,
    endStop
}: RouteMapProps) {
    const { t } = useLanguage();
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const userMarkerRef = useRef<google.maps.Marker | null>(null);
    const userPulseMarkerRef = useRef<google.maps.Marker | null>(null);
    const [mounted, setMounted] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerLibRef = useRef<any>(null); // Cache Marker Class
    const markersRef = useRef<google.maps.Marker[]>([]);
    const selectableMarkersRef = useRef<google.maps.Marker[]>([]);
    const polylinesRef = useRef<google.maps.Polyline[]>([]);
    const pathPolylinesRef = useRef<google.maps.Polyline[]>([]);
    const selectedPointMarkersRef = useRef<google.maps.Marker[]>([]);
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

                    // Center map on user location if map is initialized and NO path is highlighted
                    if (mapInstanceRef.current && !highlightedPath) {
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
                const { Marker } = await google.maps.importLibrary("marker") as any;
                markerLibRef.current = Marker;

                const map = new Map(mapRef.current, {
                    center: { lat: 17.9757, lng: 102.6331 }, // Default Vientiane
                    zoom: 13,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    zoomControl: false, // We use custom buttons? Or default?
                    // styles: [], // customized styles removed to show POIs
                    gestureHandling: 'greedy', // Allow zooming without CTRL key
                });

                map.addListener('click', (e: any) => {
                    if (onMapClick) {
                        const lat = e.latLng.lat();
                        const lng = e.latLng.lng();
                        console.log('Map Clicked:', lat, lng);
                        onMapClick(lat, lng);
                    }
                });

                mapInstanceRef.current = map;
                setMapReady(true);
            }
        };

        if (window.google && window.google.maps) {
            initMap();
        } else {
            // Poll if needed or trust wrapper?
            // GoogleMapsWrapper handles loading, so window.google SHOULD appear.
            const interval = setInterval(() => {
                if (window.google && window.google.maps) {
                    initMap();
                    clearInterval(interval);
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, [mounted, onMapClick]); // Removed onMapClick from deps if it destabilizes, but needed for listener


    // Handle User Marker (Keep existing logic)
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
                        fillColor: '#3b82f6',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                    title: t('my_location'),
                    zIndex: 100
                });
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
        updateUserMarker();
    }, [userLocation, mounted, mapReady]);

    // Map Click Handler
    useEffect(() => {
        if (!mapReady || !mapInstanceRef.current || !window.google) return;

        const listener = mapInstanceRef.current.addListener('click', (e: any) => {
            if (onMapClick && e.latLng) {
                onMapClick(e.latLng.lat(), e.latLng.lng());
            }
        });

        return () => {
            if (window.google && window.google.maps) {
                google.maps.event.removeListener(listener);
            }
        };
    }, [mapReady, onMapClick]);

    // Handle Routes, Stops AND Highlighted Path
    useEffect(() => {
        const renderMapObjects = async () => {
            if (!mapReady || !mapInstanceRef.current || !window.google) return;

            const { Marker } = await google.maps.importLibrary("marker") as any;
            const { Polyline } = await google.maps.importLibrary("maps") as any;
            const { LatLngBounds } = await google.maps.importLibrary("core") as any;
            const { InfoWindow } = await google.maps.importLibrary("maps") as any;

            // Clear ALL existing markers and polylines
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];
            selectableMarkersRef.current.forEach(marker => marker.setMap(null));
            selectableMarkersRef.current = [];
            polylinesRef.current.forEach(polyline => polyline.setMap(null));
            polylinesRef.current = [];
            pathPolylinesRef.current.forEach(polyline => polyline.setMap(null));
            pathPolylinesRef.current = [];
            selectedPointMarkersRef.current.forEach(marker => marker.setMap(null));
            selectedPointMarkersRef.current = [];

            // ==========================================
            // CASE A: Visualizing a Path (Route Finding)
            // ==========================================
            if (highlightedPath) {
                const bounds = new LatLngBounds();

                // 1. Draw Path Segments
                highlightedPath.segments.forEach(segment => {
                    const pathCoords = segment.geometry;
                    if (!pathCoords || pathCoords.length === 0) return;

                    pathCoords.forEach(coord => bounds.extend(coord));

                    const isWalk = segment.routeId === 'WALK';

                    // Determine Color
                    let strokeColor = '#94a3b8'; // SLATE-400 (Walk)
                    if (!isWalk) {
                        // Try to find route color
                        const route = routes.find(r => r.id === segment.routeId); // Note: segment.routeId currently holds route NAME/NUMBER sometimes, or ID?
                        // In NetworkGraph currently: routeId: route.id.
                        strokeColor = route ? route.route_color : '#16a34a'; // Green fallback
                    }

                    const polyline = new Polyline({
                        path: pathCoords,
                        geodesic: true,
                        strokeColor: strokeColor,
                        strokeOpacity: isWalk ? 0.7 : 1.0,
                        strokeWeight: isWalk ? 4 : 6,
                        map: mapInstanceRef.current,
                        icons: isWalk ? [{
                            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 2 },
                            offset: '0',
                            repeat: '10px'
                        }] : [{
                            icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW },
                            offset: '100%',
                            repeat: '100px'
                        }]
                    });

                    pathPolylinesRef.current.push(polyline);
                });

                // 2. Draw Start/End Markers
                if (highlightedPath.segments.length > 0) {
                    // Start
                    const startSeg = highlightedPath.segments[0];
                    if (startSeg.geometry.length > 0) {
                        new Marker({
                            position: startSeg.geometry[0],
                            map: mapInstanceRef.current,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 6,
                                fillColor: '#2563eb', // Blue
                                fillOpacity: 1,
                                strokeColor: 'white',
                                strokeWeight: 2
                            },
                            title: 'Start',
                            zIndex: 101
                        });
                    }
                    // End
                    const endSeg = highlightedPath.segments[highlightedPath.segments.length - 1];
                    if (endSeg.geometry.length > 0) {
                        new Marker({
                            position: endSeg.geometry[endSeg.geometry.length - 1],
                            map: mapInstanceRef.current,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 6,
                                fillColor: '#dc2626', // Red
                                fillOpacity: 1,
                                strokeColor: 'white',
                                strokeWeight: 2
                            },
                            title: 'End',
                            zIndex: 101
                        });
                    }
                }

                // Fit Bounds to Path
                if (!bounds.isEmpty()) {
                    mapInstanceRef.current.fitBounds(bounds, 50); // 50px padding
                }
                return; // SKIP Case B if Path is highlighted
            }


            // ==========================================
            // CASE B: Standard Route/Stop Visualization
            // ==========================================

            // 1. Render Selectable Stops (from Near Me or Search)
            if (selectableStops.length > 0) {
                selectableStops.forEach(stop => {
                    let lat, lng;
                    if (stop.location) {
                        const loc = stop.location as any;
                        if (loc.coordinates && Array.isArray(loc.coordinates)) {
                            lng = loc.coordinates[0]; lat = loc.coordinates[1];
                        }
                    }
                    // Fallback handled in prev logic, simplifying here for brevity or keeping logic? 
                    // Let's keep existing safe logic...
                    if (!lat && !lng) {
                        // re-implement check
                        if (stop.location) {
                            const loc = stop.location as any;
                            if (loc.coordinates) { lng = loc.coordinates[0]; lat = loc.coordinates[1]; }
                            else if (typeof loc.lat === 'number') { lat = loc.lat; lng = loc.lng; }
                        }
                    }

                    if (lat && lng) {
                        const marker = new Marker({
                            position: { lat, lng },
                            map: mapInstanceRef.current,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 6,
                                fillColor: '#334155',
                                fillOpacity: 0.9,
                                strokeColor: '#ffffff',
                                strokeWeight: 2,
                            },
                            title: stop.stop_name,
                            zIndex: 1
                        });
                        if (onStopSelect) marker.addListener('click', () => onStopSelect(stop.id));
                        selectableMarkersRef.current.push(marker);
                    }
                });
            }

            // 2. Render Routes
            if (routes.length === 0 && selectableStops.length === 0) return;

            const bounds = new LatLngBounds();
            let hasRoutePoints = false;

            routes.forEach(route => {
                const stops = stopsByRoute[route.id] || [];
                if (stops.length === 0) return;

                const pathCoordinates: google.maps.LatLngLiteral[] = [];

                stops.forEach((rs, index) => {
                    const stop = rs.stops;
                    let lat, lng;
                    if (stop.location) {
                        const loc = stop.location as any;
                        if (loc.coordinates) { lng = loc.coordinates[0]; lat = loc.coordinates[1]; }
                        else if (typeof loc.lat === 'number') { lat = loc.lat; lng = loc.lng; }
                    }

                    if (lat && lng) {
                        const position = { lat, lng };
                        pathCoordinates.push(position);
                        bounds.extend(position);
                        hasRoutePoints = true;

                        if (rs.path_coordinates && Array.isArray(rs.path_coordinates)) {
                            rs.path_coordinates.forEach(coord => {
                                pathCoordinates.push(coord);
                                bounds.extend(coord);
                            });
                        }

                        const marker = new Marker({
                            position: position,
                            map: mapInstanceRef.current,
                            label: { text: `${index + 1}`, color: 'white', fontWeight: 'bold', fontSize: '10px' },
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
                            content: `<div style="padding:8px;"><strong style="font-size:14px;">${stop.stop_name}</strong></div>`
                        });
                        marker.addListener('click', () => {
                            if (onStopSelect) {
                                onStopSelect(stop.id);
                            } else {
                                infoWindow.open(mapInstanceRef.current, marker);
                            }
                        });
                        markersRef.current.push(marker);
                    }
                });

                if (pathCoordinates.length > 0) {
                    const polyline = new Polyline({
                        path: pathCoordinates,
                        geodesic: true,
                        strokeColor: route.route_color,
                        strokeOpacity: 0.8,
                        strokeWeight: 4,
                        map: mapInstanceRef.current,
                        icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW }, offset: '100%', repeat: '100px' }]
                    });
                    polylinesRef.current.push(polyline);
                }
            });

            if (!hasRoutePoints && selectableMarkersRef.current.length > 0) {
                selectableMarkersRef.current.forEach(marker => {
                    const pos = marker.getPosition();
                    if (pos) bounds.extend(pos);
                });
            }

            const currentRoutesId = routes.map(r => r.id).sort().join(',');
            // If just navigating map, don't keep refitting if content is same
            // BUT if path is highlighted, we returned early.
            // If we are here, we are in exploration mode.
            if (boundsRef.current !== currentRoutesId && !bounds.isEmpty()) {
                mapInstanceRef.current.fitBounds(bounds);
                boundsRef.current = currentRoutesId;
            }

            // 3. Draw Selected Start/End Markers (if NO path highlighted)
            if (!highlightedPath) {
                console.log('RouteMap: Drawing Start/End Markers. Start:', startStop?.stop_name, 'End:', endStop?.stop_name);

                let Marker = markerLibRef.current;
                if (!Marker) {
                    if (window.google?.maps?.Marker) {
                        Marker = window.google.maps.Marker;
                    } else {
                        const lib = await google.maps.importLibrary("marker") as any;
                        Marker = lib.Marker;
                        markerLibRef.current = Marker;
                    }
                }

                // Start Marker
                if (startStop) {
                    let lat, lng;
                    if (startStop.location) {
                        const loc = startStop.location as any;
                        if (loc.coordinates) { lng = loc.coordinates[0]; lat = loc.coordinates[1]; }
                    }
                    console.log('RouteMap: Draw Start at', lat, lng);

                    if (lat && lng) {
                        const marker = new Marker({
                            position: { lat, lng },
                            map: mapInstanceRef.current,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 6,
                                fillColor: '#2563eb', // Blue
                                fillOpacity: 1,
                                strokeColor: 'white',
                                strokeWeight: 2
                            },
                            title: 'Start',
                            zIndex: 200
                        });
                        selectedPointMarkersRef.current.push(marker);
                    }
                }

                // End Marker
                if (endStop) {
                    let lat, lng;
                    if (endStop.location) {
                        const loc = endStop.location as any;
                        if (loc.coordinates) { lng = loc.coordinates[0]; lat = loc.coordinates[1]; }
                    }
                    console.log('RouteMap: Draw End at', lat, lng);

                    if (lat && lng) {
                        const marker = new Marker({
                            position: { lat, lng },
                            map: mapInstanceRef.current,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 6,
                                fillColor: '#dc2626', // Red
                                fillOpacity: 1,
                                strokeColor: 'white',
                                strokeWeight: 2
                            },
                            title: 'End',
                            zIndex: 200
                        });
                        selectedPointMarkersRef.current.push(marker);
                    }
                }
            }
        };
        renderMapObjects();

    }, [routes, stopsByRoute, selectableStops, mounted, mapReady, highlightedPath, startStop, endStop]);

    const handleMyLocationClick = () => {
        if (!navigator.geolocation) return;
        const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 };
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                setUserLocation(pos);
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setCenter(pos);
                    mapInstanceRef.current.setZoom(17);
                }
            },
            (err) => console.warn(err),
            options
        );
        if (onMyLocationClick) onMyLocationClick();
    };

    if (!mounted) {
        return <div className="w-full h-96 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />;
    }

    return (
        <div className="w-full h-96 rounded-xl border border-slate-200 overflow-hidden shadow-md relative">
            <div ref={mapRef} className="w-full h-full" />
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
