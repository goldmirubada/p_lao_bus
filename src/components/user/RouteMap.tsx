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
    stops: { stops: Stop }[];
}

export default function RouteMap({ route, stops }: RouteMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const polylineRef = useRef<google.maps.Polyline | null>(null);

    useEffect(() => {
        if (!mapRef.current || !window.google || stops.length === 0) {
            console.log('[RouteMap] Not ready:', { hasMapRef: !!mapRef.current, hasGoogle: !!window.google, stopsLength: stops.length });
            return;
        }

        console.log('[RouteMap] Processing stops:', stops);

        // Clear existing markers and polyline
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
        if (polylineRef.current) {
            polylineRef.current.setMap(null);
        }

        // Extract coordinates from stops - handle multiple PostGIS formats
        const coordinates: google.maps.LatLngLiteral[] = stops
            .map((rs, index) => {
                const stop = rs.stops;
                console.log(`[RouteMap] Stop ${index}:`, stop.stop_name, 'location:', stop.location);

                // Try different PostGIS formats
                let lat: number | null = null;
                let lng: number | null = null;

                if (stop.location) {
                    const loc = stop.location as any;

                    // Format 1: GeoJSON-like { type: "Point", coordinates: [lng, lat] }
                    if (loc.coordinates && Array.isArray(loc.coordinates)) {
                        lng = loc.coordinates[0];
                        lat = loc.coordinates[1];
                    }
                    // Format 2: Direct WKT parsing (not expected but handle just in case)
                    else if (typeof loc === 'string') {
                        // Parse "POINT(lng lat)" format
                        const match = loc.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
                        if (match) {
                            lng = parseFloat(match[1]);
                            lat = parseFloat(match[2]);
                        }
                    }
                }

                console.log(`[RouteMap] Extracted coordinates:`, { lat, lng });

                if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                    return { lat, lng };
                }
                return null;
            })
            .filter((coord): coord is google.maps.LatLngLiteral => coord !== null);

        console.log('[RouteMap] Valid coordinates:', coordinates);

        if (coordinates.length === 0) {
            console.warn('[RouteMap] No valid coordinates found!');
            return;
        }

        // Calculate bounds
        const bounds = new google.maps.LatLngBounds();
        coordinates.forEach(coord => bounds.extend(coord));

        // Create or update map
        if (!mapInstanceRef.current) {
            const map = new google.maps.Map(mapRef.current, {
                center: coordinates[0],
                zoom: 13,
                mapTypeControl: false,
                streetViewControl: false,
            });
            mapInstanceRef.current = map;
        }

        // Fit bounds to show all stops
        mapInstanceRef.current.fitBounds(bounds);

        // Create markers for each stop
        stops.forEach((rs, index) => {
            const stop = rs.stops;
            if (stop.location && (stop.location as any).coordinates) {
                const position = {
                    lat: (stop.location as any).coordinates[1],
                    lng: (stop.location as any).coordinates[0]
                };

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

        // Create polyline to connect stops
        const polyline = new google.maps.Polyline({
            path: coordinates,
            geodesic: true,
            strokeColor: route.route_color,
            strokeOpacity: 0.8,
            strokeWeight: 4,
            map: mapInstanceRef.current,
        });

        polylineRef.current = polyline;

    }, [route, stops]);

    return (
        <div className="w-full h-96 rounded-xl border border-slate-200 overflow-hidden shadow-md">
            <div ref={mapRef} className="w-full h-full" />
        </div>
    );
}
