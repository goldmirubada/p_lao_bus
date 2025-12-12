import { supabase } from '@/lib/supabase/client';
import { ErrorType, Severity, ErrorLogContext, QueuedError } from './logger.types';

/**
 * SAFETY CONFIGURATION
 * 
 * 1. CIRCUIT_BREAKER_THRESHOLD: Stop logging if 3 consecutive failures occur.
 * 2. CIRCUIT_BREAKER_RESET_MS: Try again after 60 seconds.
 * 3. THROTTLE_MS: Ignore exact same error if it happens within 5 seconds.
 * 4. QUEUE_BATCH_TIME: Process queue every 2 seconds (non-blocking).
 */
const CONFIG = {
    CIRCUIT_BREAKER_THRESHOLD: 3,
    CIRCUIT_BREAKER_RESET_MS: 60000,
    THROTTLE_MS: 5000,
    QUEUE_BATCH_TIME: 2000,
    MAX_QUEUE_SIZE: 50, // Absolute limit to prevent memory leaks
};

class LoggerService {
    private static instance: LoggerService;
    private queue: QueuedError[] = [];
    private isProcessing = false;
    private failCount = 0;
    private circuitOpenTime = 0;
    private recentErrors: Map<string, number> = new Map(); // hash -> timestamp

    private constructor() {
        // Start background processor
        if (typeof window !== 'undefined') {
            setInterval(() => this.processQueue(), CONFIG.QUEUE_BATCH_TIME);
        }
    }

    public static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    /**
     * Main Entry Point: Safe to call from anywhere.
     * "Fire and Forget" - returns nothing, awaits nothing.
     */
    public log(
        error: Error | string | unknown,
        type: ErrorType = 'UNKNOWN',
        severity: Severity = 'error',
        context: Partial<ErrorLogContext> = {}
    ): void {
        try {
            // 1. Circuit Breaker Check
            if (this.isCircuitOpen()) {
                console.warn('Logger Circuit Open - Skipping log');
                return;
            }

            // 2. Format Error
            const message = this.getErrorMessage(error);
            const stack = error instanceof Error ? error.stack : undefined;

            // 3. Throttling (Debounce duplicate errors)
            const errorHash = `${type}:${message}`;
            const now = Date.now();
            const lastTime = this.recentErrors.get(errorHash);

            if (lastTime && now - lastTime < CONFIG.THROTTLE_MS) {
                // Skip duplicate error
                return;
            }
            this.recentErrors.set(errorHash, now);

            // Clean up old hashes map occasionally to prevent memory leak
            this.cleanupThrottleMap(now);

            // 4. Enrich Context
            const fullContext: ErrorLogContext = {
                url: typeof window !== 'undefined' ? window.location.href : '',
                userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
                ...context,
            };

            // 5. Add to Queue (Non-blocking)
            if (this.queue.length >= CONFIG.MAX_QUEUE_SIZE) {
                // Queue is full. Drop this log to save memory.
                // Optionally we could remove the oldest, but dropping new is safer for stability (less array shift ops).
                return;
            }

            this.queue.push({
                message,
                type,
                stack,
                severity,
                context: fullContext,
                timestamp: now,
            });

        } catch (e) {
            // FALBACK: If logger itself fails, just print to console and DO NOT crash app.
            console.error('Logger Internal Error:', e);
        }
    }

    // --- Internal Logic ---

    private async processQueue() {
        if (this.queue.length === 0 || this.isProcessing || this.isCircuitOpen()) return;

        this.isProcessing = true;
        const batch = [...this.queue];
        this.queue = []; // Clear queue immediately

        try {
            // const supabase = createClient(); // Used singleton imported above

            const rows = batch.map(log => ({
                error_message: log.message.substring(0, 1000), // Truncate huge messages
                error_stack: log.stack ? log.stack.substring(0, 2000) : null,
                error_type: log.type,
                severity: log.severity,
                url: log.context.url,
                user_agent: log.context.userAgent,
                user_id: log.context.userId || null,
                metadata: this.safeMetadata(log.context.metadata), // Safe serialize
                created_at: new Date(log.timestamp).toISOString(),
            }));

            const { error } = await supabase.from('system_errors').insert(rows);

            if (error) throw error;

            // Success: Reset failures
            this.failCount = 0;

        } catch (err) {
            console.error('Failed to send error logs to Supabase:', err);
            this.failCount++;

            // If server is failing, maybe put items back in queue? 
            // NO. Drop them to prevent memory explosion. Safety first.

            if (this.failCount >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
                this.circuitOpenTime = Date.now();
                console.warn(`Logger Circuit Breaker ACTIVATED. Pausing logs for ${CONFIG.CIRCUIT_BREAKER_RESET_MS}ms`);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    private isCircuitOpen(): boolean {
        if (this.circuitOpenTime > 0) {
            const now = Date.now();
            if (now - this.circuitOpenTime > CONFIG.CIRCUIT_BREAKER_RESET_MS) {
                // Reset (Half-open state effectively handled by next success/fail)
                this.circuitOpenTime = 0;
                this.failCount = 0;
                return false;
            }
            return true;
        }
        return false;
    }

    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) return error.message;
        if (typeof error === 'string') return error;
        try {
            return JSON.stringify(error);
        } catch {
            return 'Unknown Error Object';
        }
    }

    private cleanupThrottleMap(now: number) {
        if (this.recentErrors.size > 100) {
            for (const [key, time] of this.recentErrors) {
                if (now - time > CONFIG.THROTTLE_MS) {
                    this.recentErrors.delete(key);
                }
            }
        }
    }

    /**
     * Safety Helper: Ensures metadata is JSON-safe and not too huge.
     * Handles circular references and giant objects.
     */
    private safeMetadata(meta: any): any {
        if (!meta) return {};
        try {
            // Simple check: can we stringify it?
            const str = JSON.stringify(meta);
            // If it's too huge (>10KB), truncate or simplify
            if (str.length > 10000) {
                return { error: 'Metadata too large', preview: str.substring(0, 100) + '...' };
            }
            return JSON.parse(str); // Return as object/array for Supabase JSONB
        } catch (e) {
            // Circular reference or other JSON error
            return { error: 'Metadata JSON serialization failed', rawType: typeof meta };
        }
    }
}

export const logger = LoggerService.getInstance();
