'use client';

import { useEffect, useRef, useState } from 'react';

interface GPSMapPickerProps {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect: (lat: number, lng: number) => void;
}

export default function GPSMapPicker({ initialLat, initialLng, onLocationSelect }: GPSMapPickerProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [marker, setMarker] = useState<google.maps.Marker | null>(null);

    // Default to Vientiane, Laos
    const defaultCenter = { lat: 17.9757, lng: 102.6331 };

    useEffect(() => {
        if (!mapRef.current || !window.google) return;

        const initialCenter = initialLat && initialLng
            ? { lat: initialLat, lng: initialLng }
            : defaultCenter;

        const newMap = new google.maps.Map(mapRef.current, {
            center: initialCenter,
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
        });

        setMap(newMap);

        // Initial marker if coordinates exist
        if (initialLat && initialLng) {
            const newMarker = new google.maps.Marker({
                position: { lat: initialLat, lng: initialLng },
                map: newMap,
                draggable: true
            });
            setMarker(newMarker);

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

            // Update or create marker
            if (marker) {
                marker.setPosition({ lat, lng });
            } else {
                const newMarker = new google.maps.Marker({
                    position: { lat, lng },
                    map: newMap,
                    draggable: true
                });
                setMarker(newMarker);

                newMarker.addListener('dragend', (dragEvent: google.maps.MapMouseEvent) => {
                    if (dragEvent.latLng) {
                        onLocationSelect(dragEvent.latLng.lat(), dragEvent.latLng.lng());
                    }
                });
            }
        });

    }, [mapRef]); // Run once on mount

    return (
        <div className="w-full h-full min-h-[400px] relative">
            <div ref={mapRef} className="w-full h-full rounded border" />
            <div className="absolute top-2 left-2 bg-white p-2 rounded shadow text-xs text-gray-600">
                지도를 클릭하여 위치를 선택하세요.
            </div>
        </div>
    );
}
