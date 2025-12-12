import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptData } from '@/lib/encryption';

export const dynamic = 'force-static';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
    try {
        // 1. Fetch Routes - order by route_number
        const { data: routes, error: routesError } = await supabase
            .from('routes')
            .select('*')
            .eq('is_active', true)
            .order('route_number');

        if (routesError) throw routesError;

        // 3. Fetch RouteStops (Standard Select)
        const { data: routeStopsRaw, error: rsError } = await supabase
            .from('route_stops')
            .select(`
            *,
            stops (*)
        `)
            .order('sequence_order');

        if (rsError) throw rsError;

        // Helper to parse PostGIS EWKB Hex String for Points
        const parseWKBPoint = (hex: string): { lat: number, lng: number } | null => {
            try {
                // Determine buffer based on environment (Node)
                const buffer = Buffer.from(hex, 'hex');
                // Offset 9: Lng (X), Offset 17: Lat (Y) - Little Endian Doubles
                const lng = buffer.readDoubleLE(9);
                const lat = buffer.readDoubleLE(17);
                return { lat, lng };
            } catch (e) {
                return null;
            }
        };

        // 4. Group by Route ID
        const routeStopsGrouped: { [key: string]: any[] } = {};
        if (routeStopsRaw) {
            routeStopsRaw.forEach((rs: any) => {
                if (!rs.route_id) return;

                // Parse coordinates from WKB location
                if (rs.stops && rs.stops.location) {
                    if (typeof rs.stops.location === 'string') {
                        // Handle Hex String (WKB)
                        const coords = parseWKBPoint(rs.stops.location);
                        if (coords) {
                            rs.stops.lat = coords.lat;
                            rs.stops.lng = coords.lng;
                        }
                    } else if (typeof rs.stops.location === 'object' && rs.stops.location.coordinates) {
                        // Handle if it IS GeoJSON (backup)
                        rs.stops.lng = rs.stops.location.coordinates[0];
                        rs.stops.lat = rs.stops.location.coordinates[1];
                    }
                }

                if (!routeStopsGrouped[rs.route_id]) {
                    routeStopsGrouped[rs.route_id] = [];
                }
                routeStopsGrouped[rs.route_id].push(rs);
            });
        }

        // Combine
        const rawData = {
            routes,
            routeStops: routeStopsGrouped
        };

        console.time('JSON_Stringify');
        const jsonString = JSON.stringify(rawData);
        console.timeEnd('JSON_Stringify');
        console.log(`Raw Data Size: ${(jsonString.length / 1024 / 1024).toFixed(2)} MB`);

        // Encrypt
        console.time('Encryption');
        const encryptedPayload = encryptData(rawData);
        console.timeEnd('Encryption');

        return NextResponse.json({ payload: encryptedPayload });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch map data', details: error.message }, { status: 500 });
    }
}
