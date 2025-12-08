'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface GPSMapPickerProps {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect: (lat: number, lng: number) => void;
    otherStops?: Array<{
        lat: number;
        lng: number;
        name: string;
    }>;
}

export default function GPSMapPicker({ initialLat, initialLng, onLocationSelect, otherStops = [] }: GPSMapPickerProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);
    const otherMarkersRef = useRef<google.maps.Marker[]>([]);
    const [locationStatus, setLocationStatus] = useState<string>('');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    // Default to Vientiane, Laos
    const defaultCenter = { lat: 17.9757, lng: 102.6331 };

    const getCurrentLocation = () => {
        if (!navigator.geolocation || !map || !window.google?.maps) return;

        setIsLoadingLocation(true);
        setLocationStatus('위치 확인 중...');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
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

                try {
                    const { Marker } = await window.google.maps.importLibrary("marker") as any;

                    // Add blue marker for current location
                    const currentMarker = new Marker({
                        position: currentPos,
                        map: map,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: '#4285F4', // Blue-500
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                        },
                        title: '현재 위치'
                    });
                    currentLocationMarkerRef.current = currentMarker;
                    setLocationStatus('현재 위치 표시됨');
                } catch (e) {
                    console.error("Error creating current location marker", e);
                }

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
        if (!mapRef.current) return;

        const initMap = async () => {
            // Wait for google maps to be available
            if (!window.google?.maps) return;

            try {
                // Use importLibrary to ensure the maps library is loaded
                const { Map } = await window.google.maps.importLibrary("maps") as any;
                const { Marker } = await window.google.maps.importLibrary("marker") as any;

                const initialCenter = initialLat && initialLng
                    ? { lat: initialLat, lng: initialLng }
                    : defaultCenter;

                const newMap = new Map(mapRef.current, {
                    center: initialCenter,
                    zoom: initialLat && initialLng ? 14 : 12,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    zoomControl: true,
                    mapId: "DEMO_MAP_ID", // Required for some features
                });

                setMap(newMap);

                // Initial marker if coordinates exist
                if (initialLat && initialLng) {
                    const newMarker = new Marker({
                        position: { lat: initialLat, lng: initialLng },
                        map: newMap,
                        draggable: true,
                        title: '선택된 위치'
                    });
                    markerRef.current = newMarker;

                    // Drag end listener
                    newMarker.addListener('dragend', (e: any) => {
                        if (e.latLng) {
                            onLocationSelect(e.latLng.lat(), e.latLng.lng());
                        }
                    });
                }

                // Map click listener
                newMap.addListener('click', (e: any) => {
                    if (!e.latLng) return;

                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();

                    onLocationSelect(lat, lng);

                    // Remove existing marker first
                    if (markerRef.current) {
                        markerRef.current.setMap(null);
                    }

                    // Create new marker at clicked position
                    const newMarker = new Marker({
                        position: { lat, lng },
                        map: newMap,
                        draggable: true,
                        title: '선택된 위치'
                    });
                    markerRef.current = newMarker;

                    // Add drag end listener to new marker
                    newMarker.addListener('dragend', (dragEvent: any) => {
                        if (dragEvent.latLng) {
                            onLocationSelect(dragEvent.latLng.lat(), dragEvent.latLng.lng());
                        }
                    });
                });
            } catch (error) {
                console.error("Error initializing Google Maps:", error);
            }
        };

        if (window.google?.maps) {
            initMap();
        }

    }, [mapRef]); // Run once on mount

    useEffect(() => {
        if (!map) return;

        const renderOtherStops = async () => {
            if (!window.google?.maps) return;

            // Clear existing other markers
            otherMarkersRef.current.forEach(marker => marker.setMap(null));
            otherMarkersRef.current = [];

            try {
                const { Marker } = await window.google.maps.importLibrary("marker") as any;

                // Add new markers for other stops
                otherStops.forEach(stop => {
                    const marker = new Marker({
                        position: { lat: stop.lat, lng: stop.lng },
                        map: map,
                        title: stop.name,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 6,
                            fillColor: '#334155', // Slate-700
                            fillOpacity: 0.9,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                        },
                        clickable: true, // Allow clicking to see title/tooltip
                    });
                    otherMarkersRef.current.push(marker);
                });
            } catch (e) {
                console.error("Error rendering other stops", e);
            }
        };

        renderOtherStops();

    }, [map, otherStops]);

    // Initialize Autocomplete
    useEffect(() => {
        const initAutocomplete = async () => {
            if (map && inputRef.current && !autocompleteRef.current && window.google?.maps) {
                try {
                    const { Autocomplete } = await window.google.maps.importLibrary("places") as any;

                    const autocomplete = new Autocomplete(inputRef.current, {
                        fields: ["geometry", "name"],
                        types: ["establishment", "geocode"],
                    });
                    autocomplete.bindTo("bounds", map);

                    autocomplete.addListener("place_changed", async () => {
                        const place = autocomplete.getPlace();

                        if (!place.geometry || !place.geometry.location) {
                            return;
                        }

                        if (place.geometry.viewport) {
                            map.fitBounds(place.geometry.viewport);
                        } else {
                            map.setCenter(place.geometry.location);
                            map.setZoom(17);
                        }

                        if (markerRef.current) {
                            markerRef.current.setMap(null);
                        }

                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();

                        const { Marker } = await window.google.maps.importLibrary("marker") as any;
                        const newMarker = new Marker({
                            position: { lat, lng },
                            map: map,
                            draggable: true,
                            title: place.name || '선택된 위치'
                        });
                        markerRef.current = newMarker;

                        newMarker.addListener('dragend', (e: any) => {
                            if (e.latLng) {
                                onLocationSelect(e.latLng.lat(), e.latLng.lng());
                            }
                        });

                        onLocationSelect(lat, lng);
                    });

                    autocompleteRef.current = autocomplete;
                } catch (e) {
                    console.error("Error initializing autocomplete", e);
                }
            }
        };

        if (window.google?.maps) {
            initAutocomplete();
        }
    }, [map]);

    return (
        <div className="w-full h-full min-h-[300px] md:min-h-[400px] relative">
            {/* Search Input */}
            <div className="absolute top-3 left-3 z-10 w-full max-w-xs md:max-w-sm">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="장소 검색..."
                    className="w-full px-4 py-2 rounded-lg shadow-md border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
            </div>

            <div ref={mapRef} className="w-full h-full rounded-lg border border-slate-200" />

            {/* Instructions - Moved to bottom left to avoid overlap with search */}
            <div className="absolute bottom-3 left-3 bg-white px-3 py-2 rounded-lg shadow-md text-xs text-slate-600 flex items-center gap-2 border border-slate-200">
                <MapPin size={14} className="text-blue-600" />
                <span>지도를 클릭하여 위치를 선택하세요</span>
            </div>

            {/* Current Location Button */}
            <button
                onClick={getCurrentLocation}
                disabled={isLoadingLocation}
                className="absolute top-2 right-2 bg-white p-3 rounded-lg shadow-lg hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed group z-10"
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
                <div className="absolute top-16 right-3 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-md text-xs font-medium z-10">
                    {locationStatus}
                </div>
            )}
        </div>
    );
}
