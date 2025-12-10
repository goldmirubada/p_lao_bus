
import { Route, RouteStop } from '../supabase/types';
import { calculateDistance, estimateTimeMinutes, Point } from './geoUtils';
import { AdjacencyList, GraphEdge, GraphNode, PathResult, PathSegment, RouteError } from './types';

export class NetworkGraph {
    private stops: Map<string, GraphNode> = new Map();
    private adjList: AdjacencyList = new Map();
    private routeNames: Map<string, string> = new Map(); // ID -> Route Number

    // Constants
    private readonly WALK_SPEED_KMH = 4.5;
    private readonly BUS_SPEED_KMH = 30; // Average bus speed estimate
    private readonly TRANSFER_PENALTY_MINUTES = 5; // Cost penalty for switching routes

    constructor() { }

    /**
     * Builds the graph from Supabase data
     */
    public buildGraph(routes: Route[], routeStops: { [routeId: string]: any[] }) {
        console.log(`NetworkGraph: Building with ${routes.length} routes and ${Object.keys(routeStops).length} route-stop entries.`);
        this.stops.clear();
        this.adjList.clear();
        this.routeNames.clear();

        // Populate Route Names
        routes.forEach(r => this.routeNames.set(r.id, r.route_number));

        // 1. Register all Unique Nodes (Stops)
        Object.values(routeStops).flat().forEach((rs: any) => {
            const stop = rs.stops;
            if (!stop) return;

            if (!this.stops.has(stop.id)) {
                this.stops.set(stop.id, {
                    id: stop.id,
                    lat: stop.lat, // Assumes flattened structure from page.tsx
                    lng: stop.lng,
                    name: stop.stop_name
                });
                this.adjList.set(stop.id, []);
            }
        });

        // 2. Build Bus Edges (Connect consecutive stops)
        routes.forEach(route => {
            const stops = routeStops[route.id];
            if (!stops || stops.length < 2) return;

            // Sort by sequence just in case
            stops.sort((a, b) => a.sequence_order - b.sequence_order);

            for (let i = 0; i < stops.length - 1; i++) {
                const from = stops[i].stops;
                const to = stops[i + 1].stops;

                // Validate stops exist and have IDs
                if (!from || !to) continue;
                if (!from.id || !to.id) {
                    // console.warn(`[GraphBuild] Warning: Missing ID for stop in Route ${route.id}. From: ${from?.id}, To: ${to?.id}`);
                    continue;
                }

                const p1 = { lat: from.lat, lng: from.lng };
                const p2 = { lat: to.lat, lng: to.lng };
                const dist = calculateDistance(p1, p2);
                const time = estimateTimeMinutes(dist, this.BUS_SPEED_KMH);

                const edge: GraphEdge = {
                    source: from.id,
                    target: to.id,
                    routeId: route.id,
                    distanceKm: dist,
                    timeMinutes: time,
                    cost: 0, // Base cost, monetary handling later
                    pathCoordinates: stops[i].path_coordinates // Capture detailed path
                };

                this.addEdge(edge);
            }
        });

        // 3. Add Walking/Transfer Edges between nearby stops (< 500m)
        const stopNodes = Array.from(this.stops.values());
        for (let i = 0; i < stopNodes.length; i++) {
            for (let j = i + 1; j < stopNodes.length; j++) {
                const s1 = stopNodes[i];
                const s2 = stopNodes[j];
                const dist = calculateDistance(s1, s2);

                if (dist < 0.5) { // 500 meters
                    const time = estimateTimeMinutes(dist, this.WALK_SPEED_KMH);
                    const penalty = 1;

                    this.addEdge({
                        source: s1.id,
                        target: s2.id,
                        routeId: 'WALK',
                        distanceKm: dist,
                        timeMinutes: time + penalty,
                        cost: 0
                    });
                    this.addEdge({
                        source: s2.id,
                        target: s1.id,
                        routeId: 'WALK',
                        distanceKm: dist,
                        timeMinutes: time + penalty,
                        cost: 0
                    });
                }
            }
        }

        console.log(`NetworkGraph: Build Complete. Nodes: ${this.stops.size}, Edges: ${this.adjList.size}`);
    }

    private addEdge(edge: GraphEdge) {
        const edges = this.adjList.get(edge.source) || [];
        edges.push(edge);
        this.adjList.set(edge.source, edges);
    }

    /**
     * Find nearest stop to a given coordinate
     */
    public findNearestStop(lat: number, lng: number, maxDistKm: number = 2.0): GraphNode | null {
        let nearest: GraphNode | null = null;
        let minKm = Infinity;

        this.stops.forEach(stop => {
            const dist = calculateDistance({ lat, lng }, stop);
            if (dist < minKm && dist <= maxDistKm) {
                minKm = dist;
                nearest = stop;
            }
        });

        return nearest;
    }

    /**
     * Implement Dijkstra's Algorithm
     */
    /**
     * Implement Dijkstra's Algorithm
     */
    public findShortestPath(startLat: number, startLng: number, endLat: number, endLng: number): PathResult | RouteError {
        // 0. Pre-checks
        if (this.stops.size === 0 || this.adjList.size === 0) {
            return { code: 'SYSTEM_ERROR' };
        }

        const directDist = calculateDistance({ lat: startLat, lng: startLng }, { lat: endLat, lng: endLng });

        if (directDist < 0.01) {
            return { code: 'SAME_LOCATION' };
        }

        if (directDist < 0.5) {
            return { code: 'TOO_CLOSE' };
        }

        // Vientiane Rough BBox Checks (Expanded for safety)
        if (startLat < 17.8 || startLat > 18.2 || startLng < 102.3 || startLng > 102.9 ||
            endLat < 17.8 || endLat > 18.2 || endLng < 102.3 || endLng > 102.9) {
            return { code: 'OUT_OF_SERVICE_AREA' };
        }

        // 1. Find nearest start and end nodes (Stops)
        // Real implementation should support "Walking from start to Stop A"
        const startNode = this.findNearestStop(startLat, startLng);
        const endNode = this.findNearestStop(endLat, endLng);

        // console.log(`[GraphSearch] Request: (${startLat},${startLng}) -> (${endLat},${endLng})`);

        if (!startNode) {
            return { code: 'START_TOO_FAR' };
        }
        if (!endNode) {
            return { code: 'END_TOO_FAR' };
        }

        // Standard Dijkstra Initialization
        const scores = new Map<string, number>(); // Minimal Time to node
        const visited = new Set<string>();
        const previous = new Map<string, { edge: GraphEdge, from: string }>();

        // Init scores
        this.stops.forEach(s => scores.set(s.id, Infinity));
        scores.set(startNode.id, 0);

        // Priority Queue (Naive Array impl for simplicity given Graph size < 1000 nodes)
        const queue: string[] = [startNode.id];

        while (queue.length > 0) {
            // Get node with smallest score
            queue.sort((a, b) => (scores.get(a) ?? Infinity) - (scores.get(b) ?? Infinity));
            const currentId = queue.shift()!;

            // console.log(`[Dijkstra] Popped ${currentId}, Score: ${scores.get(currentId)}`);

            if (currentId === endNode.id) {
                break; // Reached target
            }
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const currentScore = scores.get(currentId) ?? Infinity;
            if (currentScore === Infinity) continue;

            const neighbors = this.adjList.get(currentId) || [];
            const incomingEdge = previous.get(currentId)?.edge;

            for (const edge of neighbors) {
                if (visited.has(edge.target)) continue;

                let newScore = currentScore + edge.timeMinutes;

                // Apply Transfer Penalty
                if (incomingEdge && incomingEdge.routeId !== edge.routeId) {
                    newScore += this.TRANSFER_PENALTY_MINUTES;
                }

                if (newScore < (scores.get(edge.target) ?? Infinity)) {
                    // console.log(`[Dijkstra] Updating ${edge.target} score to ${newScore} (from ${currentId})`);
                    scores.set(edge.target, newScore);
                    previous.set(edge.target, { edge, from: currentId });
                    if (!queue.includes(edge.target)) queue.push(edge.target);
                }
            }
        }

        // Reconstruct Path
        if (!previous.has(endNode.id)) {
            return { code: 'NO_PATH_FOUND' };
        }

        const pathSegments: PathSegment[] = [];
        let curr = endNode.id;
        let totalTime = scores.get(endNode.id) || 0;
        let totalDist = 0;

        // Add Walk Segment (End)
        const walkEndDist = calculateDistance(endNode, { lat: endLat, lng: endLng });
        const walkEndTime = estimateTimeMinutes(walkEndDist, this.WALK_SPEED_KMH);

        // We backtrack, so we build in reverse first
        const corePath: PathSegment[] = [];

        while (previous.has(curr)) {
            const record = previous.get(curr)!;
            const prevEdge = record.edge;

            // Retrieve coordinates for geometry (prefer detailed path, fallback to straight line)
            const fromStop = this.stops.get(record.from);
            const toStop = this.stops.get(curr);

            // Clone to avoid mutation
            let segmentGeometry = prevEdge.pathCoordinates ? [...prevEdge.pathCoordinates] : [];

            if (fromStop && toStop) {
                if (segmentGeometry.length === 0) {
                    segmentGeometry = [{ lat: fromStop.lat, lng: fromStop.lng }, { lat: toStop.lat, lng: toStop.lng }];
                } else {
                    // Ensure visual connectivity (Stitch start/end if gap > 5m)
                    const startGap = calculateDistance({ lat: fromStop.lat, lng: fromStop.lng }, segmentGeometry[0]);
                    if (startGap > 0.005) {
                        segmentGeometry.unshift({ lat: fromStop.lat, lng: fromStop.lng });
                    }
                    const endGap = calculateDistance({ lat: toStop.lat, lng: toStop.lng }, segmentGeometry[segmentGeometry.length - 1]);
                    if (endGap > 0.005) {
                        segmentGeometry.push({ lat: toStop.lat, lng: toStop.lng });
                    }
                }
            }

            const routeName = this.routeNames.get(prevEdge.routeId) || prevEdge.routeId;

            corePath.unshift({
                fromStopId: record.from,
                toStopId: curr,
                routeId: prevEdge.routeId,
                description: routeName,
                timeMinutes: prevEdge.timeMinutes,
                geometry: segmentGeometry
            });

            totalDist += prevEdge.distanceKm;
            curr = record.from;
        }

        // Add Walk Segment (Start)
        const walkStartDist = calculateDistance({ lat: startLat, lng: startLng }, startNode);
        const walkStartTime = estimateTimeMinutes(walkStartDist, this.WALK_SPEED_KMH);

        const transfers = this.countTransfers(corePath);

        // VALIDATION: Check constraints
        if (transfers > 4) {
            return { code: 'TRANSFER_LIMIT_EXCEEDED' };
        }

        const totalWalkDist = walkStartDist + walkEndDist;
        const totalTripDist = totalDist + totalWalkDist;

        // If walking is more than 80% AND absolute walk is > 1.5km
        if (totalWalkDist > 1.5 && (totalWalkDist / totalTripDist) > 0.8) {
            return { code: 'WALKING_TOO_LONG' };
        }

        // Assemble Full Path
        const fullPath: PathSegment[] = [
            {
                fromStopId: "START",
                toStopId: startNode.id,
                routeId: "WALK",
                description: "Walk to Stop",
                timeMinutes: walkStartTime,
                geometry: [
                    { lat: startLat, lng: startLng },
                    { lat: startNode.lat, lng: startNode.lng }
                ]
            },
            ...corePath,
            {
                fromStopId: endNode.id,
                toStopId: "END",
                routeId: "WALK",
                description: "Walk to Destination",
                timeMinutes: walkEndTime,
                geometry: [
                    { lat: endNode.lat, lng: endNode.lng },
                    { lat: endLat, lng: endLng }
                ]
            }
        ];

        return {
            segments: fullPath,
            totalTimeMinutes: totalTime + walkStartTime + walkEndTime,
            totalDistanceKm: totalTripDist,
            transfers: transfers
        };
    }

    private countTransfers(segments: PathSegment[]): number {
        let transfers = 0;
        let prevRoute = "";
        for (const seg of segments) {
            if (prevRoute && seg.routeId !== prevRoute) transfers++;
            prevRoute = seg.routeId;
        }
        return transfers;
    }
}
