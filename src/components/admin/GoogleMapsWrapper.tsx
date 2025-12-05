'use client';

import { ReactNode, useEffect, useState } from 'react';

// Type declaration for Google Maps
declare global {
    interface Window {
        google: any;
    }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const SCRIPT_ID = 'google-maps-script';

export default function GoogleMapsWrapper({ children }: { children: ReactNode }) {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            console.error('Google Maps API Key is missing');
            return;
        }

        // Check if Google Maps is already loaded
        if (window.google?.maps) {
            setLoaded(true);
            return;
        }

        // Check if script tag already exists
        const existingScript = document.getElementById(SCRIPT_ID);
        if (existingScript) {
            // Script is loading or already loaded
            const checkLoaded = setInterval(() => {
                if (window.google?.maps) {
                    setLoaded(true);
                    clearInterval(checkLoaded);
                }
            }, 100);
            return () => clearInterval(checkLoaded);
        }

        // Create and add script
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setLoaded(true);
        script.onerror = () => {
            console.error('Failed to load Google Maps API');
        };
        document.head.appendChild(script);

    }, []);

    if (!loaded) {
        return (
            <div className="bg-slate-100 h-full flex items-center justify-center rounded-xl">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-slate-600">지도 로딩 중...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
