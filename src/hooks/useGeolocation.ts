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

    const getLocation = () => {
        if (!navigator.geolocation) {
            setState(prev => ({ ...prev, error: 'Geolocation is not supported', loading: false }));
            return;
        }

        setState(prev => ({ ...prev, loading: true, error: null }));

        const handleSuccess = (position: GeolocationPosition) => {
            setState({
                location: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                },
                error: null,
                loading: false,
            });
        };

        const handleError = (error: GeolocationPositionError) => {
            setState(prev => ({
                ...prev,
                error: error.message,
                loading: false,
            }));
        };

        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000
        });
    };

    useEffect(() => {
        getLocation();
    }, []);

    return { ...state, retry: getLocation };
}
