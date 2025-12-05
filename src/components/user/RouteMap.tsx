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
}

export default function RouteMap({ route, stops }: RouteMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const polylineRef = useRef<google.maps.Polyline | null>(null);

    useEffect(() => {
        if (!mapRef.current || !window.google || stops.length === 0) {
            return;
        }

        // Clear existing markers and polyline
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
        if (polylineRef.current) {
            polylineRef.current.setMap(null);
        }

        // Extract all coordinates including waypoints
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

        if (allPathCoordinates.length === 0) {
            return;
        }

        // Calculate bounds
        const bounds = new google.maps.LatLngBounds();
        allPathCoordinates.forEach(coord => bounds.extend(coord));

        // Create or update map
        if (!mapInstanceRef.current) {
            const map = new google.maps.Map(mapRef.current, {
                center: allPathCoordinates[0],
                zoom: 13,
                mapTypeControl: false,
                streetViewControl: false,
            });
            mapInstanceRef.current = map;
        }

        // Fit bounds to show all stops and path
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

        // Create polyline to connect stops including waypoints
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

    }, [route, stops]);

    return (
        <div className="w-full h-96 rounded-xl border border-slate-200 overflow-hidden shadow-md">
            <div ref={mapRef} className="w-full h-full" />
        </div>
    );
}
