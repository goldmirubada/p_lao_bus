'use client';

import { useEffect, useRef } from 'react';
import { Route, Stop } from '@/lib/supabase/types';

// Type declaration for Google Maps
declare global {
    interface Window {
        google: any;
    }
}

interface RouteMapProps {
    route: Route;
    stops: {
        stops: Stop;
        path_coordinates?: { lat: number; lng: number }[];
    }[];
    selectableStops?: Stop[];
    onStopSelect?: (stopId: string) => void;
}

export default function RouteMap({ route, stops, selectableStops = [], onStopSelect }: RouteMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const selectableMarkersRef = useRef<google.maps.Marker[]>([]);
    const polylineRef = useRef<google.maps.Polyline | null>(null);

    useEffect(() => {
        if (!mapRef.current || !window.google) {
            return;
        }

        // Initialize map if needed
        if (!mapInstanceRef.current) {
            const map = new google.maps.Map(mapRef.current, {
                center: { lat: 17.9757, lng: 102.6331 }, // Default Vientiane
                zoom: 13,
                mapTypeControl: false,
                streetViewControl: false,
                gestureHandling: 'greedy', // Allow zooming without CTRL key
            });
            mapInstanceRef.current = map;
        }

        // Clear existing markers and polyline
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
        selectableMarkersRef.current.forEach(marker => marker.setMap(null));
        selectableMarkersRef.current = [];
        if (polylineRef.current) {
            polylineRef.current.setMap(null);
        }

        // 1. Render Selectable Stops (All available stops)
        if (selectableStops.length > 0) {
            selectableStops.forEach(stop => {
                // Skip if stop is already in the route (optional, but good for clarity)
                // const isAlreadyInRoute = stops.some(rs => rs.stops.id === stop.id);
                // if (isAlreadyInRoute) return;

                let lat: number | null = null;
                let lng: number | null = null;

                if (stop.location) {
                    const loc = stop.location as any;
                    if (loc.coordinates && Array.isArray(loc.coordinates)) {
                        lng = loc.coordinates[0];
                        lat = loc.coordinates[1];
                    } else if (typeof stop.lat === 'number' && typeof stop.lng === 'number') {
                        // Fallback for flat lat/lng if provided
                        lat = stop.lat;
                        lng = stop.lng;
                    }
                }

                if (lat !== null && lng !== null) {
                    const marker = new google.maps.Marker({
                        position: { lat, lng },
                        map: mapInstanceRef.current,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 6,
                            fillColor: '#334155', // Slate-700 (Darker Gray)
                            fillOpacity: 0.9,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                        },
                        title: stop.stop_name,
                        zIndex: 1 // Lower z-index than route stops
                    });

                    // Add click listener to add stop
                    if (onStopSelect) {
                        marker.addListener('click', () => {
                            onStopSelect(stop.id);
                        });
                    }

                    selectableMarkersRef.current.push(marker);
                }
            });
        }

        // 2. Render Route Stops and Path
        if (stops.length === 0 && selectableStops.length === 0) {
            return;
        }

        // Extract all coordinates including waypoints for bounds and polyline
        const allPathCoordinates: google.maps.LatLngLiteral[] = [];

        stops.forEach((rs, index) => {
            const stop = rs.stops;
            let lat: number | null = null;
            let lng: number | null = null;

            if (stop.location) {
                const loc = stop.location as any;
                if (loc.coordinates && Array.isArray(loc.coordinates)) {
                    lng = loc.coordinates[0];
                    lat = loc.coordinates[1];
                } else if (typeof (stop as any).lat === 'number' && typeof (stop as any).lng === 'number') {
                    lat = (stop as any).lat;
                    lng = (stop as any).lng;
                }
            }

            if (lat !== null && lng !== null) {
                // Add current stop coordinate
                allPathCoordinates.push({ lat, lng });

                // Add path coordinates (waypoints) to next stop if they exist
                if (rs.path_coordinates && Array.isArray(rs.path_coordinates)) {
                    allPathCoordinates.push(...rs.path_coordinates);
                }
            }
        });

        // Calculate bounds
        const bounds = new google.maps.LatLngBounds();

        // Add route coordinates to bounds
        allPathCoordinates.forEach(coord => bounds.extend(coord));

        // Add selectable stops to bounds if route is empty, or just to ensure visibility
        if (allPathCoordinates.length === 0 && selectableMarkersRef.current.length > 0) {
            selectableMarkersRef.current.forEach(marker => {
                const pos = marker.getPosition();
                if (pos) bounds.extend(pos);
            });
        }

        // Fit bounds
        if (!bounds.isEmpty()) {
            mapInstanceRef.current.fitBounds(bounds);
        }

        // Create markers for each route stop
        stops.forEach((rs, index) => {
            const stop = rs.stops;
            let lat: number | null = null;
            let lng: number | null = null;

            if (stop.location) {
                const loc = stop.location as any;
                if (loc.coordinates && Array.isArray(loc.coordinates)) {
                    lng = loc.coordinates[0];
                    lat = loc.coordinates[1];
                } else if (typeof (stop as any).lat === 'number' && typeof (stop as any).lng === 'number') {
                    lat = (stop as any).lat;
                    lng = (stop as any).lng;
                }
            }

            if (lat !== null && lng !== null) {
                const position = { lat, lng };

                const marker = new google.maps.Marker({
                    position: position,
                    map: mapInstanceRef.current,
                    label: {
                        text: `${index + 1}`,
                        color: 'white',
                        fontWeight: 'bold',
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: route.route_color,
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3,
                    },
                    title: stop.stop_name,
                    zIndex: 10 // Higher z-index for route stops
                });

                // Add info window
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="padding: 8px;">
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

        // Create polyline to connect stops including waypoints
        if (allPathCoordinates.length > 0) {
            const polyline = new google.maps.Polyline({
                path: allPathCoordinates,
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
            polylineRef.current = polyline;
        }

    }, [route, stops, selectableStops]);

    return (
        <div className="w-full h-96 rounded-xl border border-slate-200 overflow-hidden shadow-md">
            <div ref={mapRef} className="w-full h-full" />
        </div>
    );
}
