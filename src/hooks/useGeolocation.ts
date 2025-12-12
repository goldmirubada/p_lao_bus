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

export function useGeolocation() {
    const [state, setState] = useState<GeolocationState>({
        location: null,
        error: null,
        loading: true,
    });

    const getLocation = async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Dynamic import to avoid SSR issues
            const { Geolocation } = await import('@capacitor/geolocation');

            // Check and request permissions
            try {
                const permissionStatus = await Geolocation.checkPermissions();
                if (permissionStatus.location !== 'granted') {
                    const requestStatus = await Geolocation.requestPermissions();
                    if (requestStatus.location !== 'granted') {
                        throw new Error('Location permission denied');
                    }
                }
            } catch (permError) {
                // On web, checkPermissions might fail or behave differently, 
                // proceed to try getCurrentPosition which handles permissions flow on web too
                console.warn("Permission check failed, processing anyway:", permError);
            }

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000
            });

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
        getLocation();
    }, []);

    return { ...state, retry: getLocation };
}
