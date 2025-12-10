
export interface GraphNode {
    id: string; // Stop ID
    lat: number;
    lng: number;
    name: string;
}

export interface GraphEdge {
    source: string; // Source Stop ID
    target: string; // Target Stop ID
    routeId: string; // "WALK" or Bus Route ID
    distanceKm: number;
    timeMinutes: number;
    cost: number; // For detailed fare calculation later
    pathCoordinates?: { lat: number; lng: number }[];
}

// Result of a pathfinding operation
export interface PathSegment {
    fromStopId: string;
    toStopId: string;
    routeId: string; // "WALK" or Bus Route ID
    description: string;
    timeMinutes: number;
    geometry: { lat: number, lng: number }[]; // For plotting
}

export interface PathResult {
    segments: PathSegment[];
    totalTimeMinutes: number;
    totalDistanceKm: number;
    transfers: number;
}

// Adjacency List: Map<StopID, Edge[]>
export type AdjacencyList = Map<string, GraphEdge[]>;

export type RouteErrorType =
    | 'START_TOO_FAR'
    | 'END_TOO_FAR'
    | 'SAME_LOCATION'
    | 'TOO_CLOSE'
    | 'SYSTEM_ERROR'
    | 'OUT_OF_SERVICE_AREA'
    | 'TRANSFER_LIMIT_EXCEEDED'
    | 'WALKING_TOO_LONG'
    | 'NO_PATH_FOUND';

export interface RouteError {
    code: RouteErrorType;
    message?: string;
}
