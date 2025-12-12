export type ErrorType =
    | 'JAVASCRIPT'        // Uncaught exceptions
    | 'REACT_RENDER'      // Error Boundary catches
    | 'HYDRATION'         // UI Mismatch
    | 'API_NET'           // Network failure
    | 'API_SERVER'        // 5xx, 4xx
    | 'DATA_INTEGRITY'    // Zod schema mismatch
    | 'RESOURCE_LOAD'     // Image/Script fail
    | 'GOOGLE_MAPS'       // Map auth/rendering fail
    | 'GEOLOCATION'       // GPS fail
    | 'ROUTING'           // Navigation fail
    | 'STORAGE'           // LocalStorage full/blocked
    | 'NATIVE_APP'        // Capacitor plugin fail
    | 'AUTH_SESSION'      // Auth state fail
    | 'UNKNOWN';

export type Severity = 'error' | 'warning' | 'critical';

export interface ErrorLogContext {
    userId?: string;
    url?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    componentName?: string;
}

export interface QueuedError {
    message: string;
    type: ErrorType;
    stack?: string;
    severity: Severity;
    context: ErrorLogContext;
    timestamp: number;
}
