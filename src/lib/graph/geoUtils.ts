
// Earth radius in kilometers
const R = 6371;

export interface Point {
    lat: number;
    lng: number;
}

/**
 * Calculates the distance between two points in kilometers using Haversine formula
 */
export function calculateDistance(p1: Point, p2: Point): number {
    const dLat = toRad(p2.lat - p1.lat);
    const dLon = toRad(p2.lng - p1.lng);
    const lat1 = toRad(p1.lat);
    const lat2 = toRad(p2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(value: number): number {
    return value * Math.PI / 180;
}

/**
 * Estimates travel time in minutes
 * @param distanceKm Distance in km
 * @param speedKmh Speed in km/h (default: 30km/h for bus, 4km/h for walking)
 */
export function estimateTimeMinutes(distanceKm: number, speedKmh: number): number {
    if (speedKmh <= 0) return Infinity; // Prevent division by zero
    const hours = distanceKm / speedKmh;
    return hours * 60;
}
