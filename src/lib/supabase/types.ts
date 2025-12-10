export type Route = {
    id: string;
    route_number: string;
    route_name: string;
    route_color: string;
    route_type: string; // Legacy, kept for reference
    group_id?: string; // Foreign Key to route_groups
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type RouteGroup = {
    id: string;
    name: string;
    sort_order: number;
    created_at: string;
};

export type Stop = {
    id: string;
    stop_name: string;
    stop_name_en: string | null;
    location: string; // PostGIS POINT string representation or handled via RPC
    schematic_x: number | null;
    schematic_y: number | null;
    image_url: string | null;
    description: string | null;
    lat?: number; // Optional runtime property from WKB parsing
    lng?: number; // Optional runtime property from WKB parsing
    created_at: string;
    updated_at: string;
};

export type RouteStop = {
    id: string;
    route_id: string;
    stop_id: string;
    sequence_order: number;
    direction: 'outbound' | 'inbound';
    created_at: string;
    // Joins
    routes?: Route;
    stops?: Stop;
};

export type Feedback = {
    id: string;
    user_id: string;
    user_email: string; // Stored for display convenience
    category: string;
    content: string;
    stop_id: string | null;
    status: 'pending' | 'resolved' | 'ignored';
    created_at: string;
    // Joins
    stops?: Stop;
};

export type RouteStopWithDetail = RouteStop & {
    stops: Stop;
};
