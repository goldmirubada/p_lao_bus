
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
