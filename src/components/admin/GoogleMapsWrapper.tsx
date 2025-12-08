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

        const initLoader = () => {
            (function (g: any) { var h: any, a: any, k: any, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window as any; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams(), u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, (t: any) => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f: any, ...n: any) => r.add(f) && u().then(() => d[l](f, ...n)) })({
                key: GOOGLE_MAPS_API_KEY,
                v: "weekly",
                loading: "async",
                libraries: "places"
            });
        };

        initLoader();

        // Poll for maps availability
        const checkLoaded = setInterval(() => {
            if (window.google?.maps?.importLibrary) {
                setLoaded(true);
                clearInterval(checkLoaded);
            }
        }, 100);

        return () => clearInterval(checkLoaded);

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
