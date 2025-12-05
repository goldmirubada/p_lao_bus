'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface GPSMapPickerProps {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect: (lat: number, lng: number) => void;
}

export default function GPSMapPicker({ initialLat, initialLng, onLocationSelect }: GPSMapPickerProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
    const [locationStatus, setLocationStatus] = useState<string>('');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    // Default to Vientiane, Laos
    const defaultCenter = { lat: 17.9757, lng: 102.6331 };

    const getCurrentLocation = () => {
        if (!navigator.geolocation || !map) return;

        setIsLoadingLocation(true);
        setLocationStatus('위치 확인 중...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const currentPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // Center map on current location
                map.setCenter(currentPos);
                map.setZoom(15);

                // Remove old current location marker
                if (currentLocationMarkerRef.current) {
                    currentLocationMarkerRef.current.setMap(null);
                }

                // Add blue marker for current location
                const currentMarker = new google.maps.Marker({
                    position: currentPos,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: '#4285F4',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                    title: '현재 위치'
                });
                currentLocationMarkerRef.current = currentMarker;
                setLocationStatus('현재 위치 표시됨');
                setIsLoadingLocation(false);

                // Auto-hide status after 2 seconds
                setTimeout(() => setLocationStatus(''), 2000);
            },
            (error) => {
                console.warn('Geolocation error:', error);
                setLocationStatus('위치 확인 실패');
                setIsLoadingLocation(false);
                setTimeout(() => setLocationStatus(''), 2000);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    };

    useEffect(() => {
        if (!mapRef.current || !window.google) return;

        const initialCenter = initialLat && initialLng
            ? { lat: initialLat, lng: initialLng }
            : defaultCenter;

        const newMap = new google.maps.Map(mapRef.current, {
            center: initialCenter,
            zoom: initialLat && initialLng ? 14 : 12,
            mapTypeControl: false,
            streetViewControl: false,
            zoomControl: true,
        });

        setMap(newMap);

        // Initial marker if coordinates exist
        if (initialLat && initialLng) {
            const newMarker = new google.maps.Marker({
                position: { lat: initialLat, lng: initialLng },
                map: newMap,
                draggable: true,
                title: '선택된 위치'
            });
            markerRef.current = newMarker;

            // Drag end listener
            newMarker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
                if (e.latLng) {
                    onLocationSelect(e.latLng.lat(), e.latLng.lng());
                }
            });
        }

        // Map click listener
        newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;

            const lat = e.latLng.lat();
            const lng = e.latLng.lng();

            onLocationSelect(lat, lng);

            // Remove existing marker first
            if (markerRef.current) {
                markerRef.current.setMap(null);
            }

            // Create new marker at clicked position
            const newMarker = new google.maps.Marker({
                position: { lat, lng },
                map: newMap,
                draggable: true,
                title: '선택된 위치'
            });
            markerRef.current = newMarker;

            // Add drag end listener to new marker
            newMarker.addListener('dragend', (dragEvent: google.maps.MapMouseEvent) => {
                if (dragEvent.latLng) {
                    onLocationSelect(dragEvent.latLng.lat(), dragEvent.latLng.lng());
                }
            });
        });

    }, [mapRef]); // Run once on mount

    return (
        <div className="w-full h-full min-h-[400px] relative">
            <div ref={mapRef} className="w-full h-full rounded-lg border border-slate-200" />

            {/* Instructions */}
            <div className="absolute top-3 left-3 bg-white px-3 py-2 rounded-lg shadow-md text-xs text-slate-600 flex items-center gap-2 border border-slate-200">
                <MapPin size={14} className="text-blue-600" />
                <span>지도를 클릭하여 위치를 선택하세요</span>
            </div>

            {/* Current Location Button */}
            <button
                onClick={getCurrentLocation}
                disabled={isLoadingLocation}
                className="absolute bottom-24 right-3 bg-white p-3 rounded-lg shadow-lg hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                title="현재 위치로 이동"
            >
                {isLoadingLocation ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                ) : (
                    <Navigation size={20} className="text-blue-600 group-hover:text-blue-700" />
                )}
            </button>

            {/* Location Status */}
            {locationStatus && (
                <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-md text-xs font-medium">
                    {locationStatus}
                </div>
            )}
        </div>
    );
}
