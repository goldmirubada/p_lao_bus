export type Route = {
    id: string;
    route_number: string;
    route_name: string;
    route_color: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
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
