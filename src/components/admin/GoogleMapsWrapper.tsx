'use client';

import { ReactNode, useEffect, useState } from 'react';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function GoogleMapsWrapper({ children }: { children: ReactNode }) {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!GOOGLE_MAPS_API_KEY) {
            console.error('Google Maps API Key is missing');
            return;
        }

        if (window.google?.maps) {
            setLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setLoaded(true);
        document.head.appendChild(script);

        return () => {
            // Cleanup if needed
        };
    }, []);

    if (!loaded) return <div className="bg-gray-100 h-full flex items-center justify-center">지도 로딩 중...</div>;

    return <>{children}</>;
}
