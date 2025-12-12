import { useState, useEffect } from 'react';

interface Location {
    latitude: number;
    longitude: number;
    accuracy: number;
}

interface GeolocationState {
    location: Location | null;
    error: string | null;
    loading: boolean;
}

export function useGeolocation(options: { autoFetch?: boolean } = { autoFetch: true }) {
    const { autoFetch = true } = options;
    const [state, setState] = useState<GeolocationState>({
        location: null,
        error: null,
        loading: autoFetch, // Only show loading initially if autoFetch is true
    });

    const setManualLocation = (lat: number, lng: number) => {
        setState(prev => ({
            ...prev,
            location: { latitude: lat, longitude: lng, accuracy: 0 },
            loading: false,
            error: null
        }));
    };

    const setLoading = (isLoading: boolean) => {
        setState(prev => ({ ...prev, loading: isLoading }));
    };

    const getLocation = async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Dynamic import to avoid SSR issues
            const { Geolocation } = await import('@capacitor/geolocation');

            // Check and request permissions
            try {
                const permissionStatus = await Geolocation.checkPermissions();
                if (permissionStatus.location !== 'granted') {
                    // Try to request permissions
                    await Geolocation.requestPermissions();
                }
            } catch (permError) {
                console.warn("Permission check failed, processing anyway:", permError);
            }

            let position;
            try {
                // [Scenario 1: Balanced]
                // First try with high accuracy (GPS) - Fast timeout
                position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 30000
                });
            } catch (e) {
                console.warn("High accuracy location failed, trying low accuracy:", e);
                // Fallback to low accuracy (Network)
                position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 30000
                });
            }

            setState({
                location: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                },
                error: null,
                loading: false,
            });
        } catch (err: any) {
            console.error("Geolocation error:", err);
            setState(prev => ({
                ...prev,
                error: err.message || 'Error getting location',
                loading: false,
            }));
        }
    };

    useEffect(() => {
        if (autoFetch) {
            getLocation();
        }
    }, [autoFetch]);

    return { ...state, retry: getLocation, setManualLocation, setLoading };
}
