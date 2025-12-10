
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { encryptData } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Fetch Routes
        const { data: routesData, error: routesError } = await supabase
            .from('routes')
            .select('*')
            .eq('is_active', true)
            .order('route_number');

        if (routesError) throw routesError;

        // 2. Fetch All Stops (Coordinates)
        const { data: allStopsData, error: stopsError } = await supabase.rpc('get_stops_with_coordinates');

        if (stopsError) {
            console.error('Error fetching stops:', stopsError);
            throw stopsError;
        }

        const stopLocationMap = new Map();
        if (allStopsData) {
            allStopsData.forEach((stop: any) => {
                stopLocationMap.set(stop.id, { lat: stop.lat, lng: stop.lng });
            });
        }

        // 3. Fetch Route Stops and Join Data
        let routeStopsData: any = {};

        if (routesData) {
            const promises = routesData.map(async (route) => {
                const { data, error } = await supabase
                    .from('route_stops')
                    .select('*, stops(*)')
                    .eq('route_id', route.id)
                    .order('sequence_order');

                if (error) {
                    console.error(`Error fetching stops for route ${route.id}:`, error);
                    return null;
                }

                if (data) {
                    const stopsWithCoords = data.map((rs: any) => {
                        // Safety check if stops is null
                        if (!rs.stops) return rs;

                        const coords = stopLocationMap.get(rs.stops.id);
                        if (coords) {
                            // Enhance stop object with location data
                            rs.stops.location = {
                                type: 'Point',
                                coordinates: [coords.lng, coords.lat]
                            };
                            rs.stops.lat = coords.lat;
                            rs.stops.lng = coords.lng;
                        }
                        return rs;
                    });
                    return { routeId: route.id, data: stopsWithCoords };
                }
                return null;
            });

            const results = await Promise.all(promises);

            results.forEach(result => {
                if (result) {
                    routeStopsData[result.routeId] = result.data;
                }
            });
        }

        const fullData = {
            routes: routesData,
            routeStops: routeStopsData
        };

        // 4. Encrypt the payload
        const encryptedPayload = encryptData(fullData);
        // const encryptedPayload = "TEST_DISABLED_ENCRYPTION";

        // Return only the encrypted string
        return NextResponse.json({ payload: encryptedPayload });

    } catch (error) {
        console.error('API Route Error Detailed:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
