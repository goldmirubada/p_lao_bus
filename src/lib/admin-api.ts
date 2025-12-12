import { supabase } from '@/lib/supabase/client';
import { ErrorType, Severity } from './logger.types';

export interface SystemErrorLog {
    id: number;
    created_at: string;
    error_message: string;
    error_stack: string | null;
    error_type: ErrorType;
    severity: Severity;
    url: string | null;
    user_agent: string | null;
    user_id: string | null;
    metadata: any;
    resolved: boolean;
}

export const AdminErrorService = {
    /**
     * Fetch error logs with pagination and filters
     */
    async getErrors(page = 1, pageSize = 20, filters?: { type?: string; severity?: string }) {
        let query = supabase
            .from('system_errors')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (filters?.type && filters.type !== 'ALL') {
            query = query.eq('error_type', filters.type);
        }

        if (filters?.severity && filters.severity !== 'ALL') {
            query = query.eq('severity', filters.severity);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return { data: data as SystemErrorLog[], count: count || 0 };
    },

    /**
     * Get summary statistics for the dashboard
     */
    async getStats() {
        // Top 3 frequent errors
        const { data: topErrors, error: topError } = await supabase
            .rpc('get_top_errors') // Optional: if we want advanced stats, otherwise simple counts in client
            .limit(3);

        // Simple counts for now (Supabase doesn't have easy group-by without RPC or heavy client logic)
        // We will just fetch counts of Critical errors for the badge
        const { count: criticalCount } = await supabase
            .from('system_errors')
            .select('*', { count: 'exact', head: true })
            .eq('severity', 'error');

        const { count: totalCount } = await supabase
            .from('system_errors')
            .select('*', { count: 'exact', head: true });

        return {
            criticalCount: criticalCount || 0,
            totalCount: totalCount || 0
        };
    },

    /**
     * Delete a single error log
     */
    async deleteError(id: number) {
        // Use the RPC function if RLS is strict, or direct delete if policy allows
        // We try direct first, fallback to RPC
        const { error } = await supabase.from('system_errors').delete().eq('id', id);
        if (error) {
            // Try RPC
            const { error: rpcError } = await supabase.rpc('delete_system_error', { log_id: id });
            if (rpcError) throw rpcError;
        }
    },

    /**
     * Retention: Cleanup old logs
     */
    async cleanupOldLogs(daysToKeep: number) {
        const { data, error } = await supabase.rpc('cleanup_system_errors', { days_to_keep: daysToKeep });
        if (error) throw error;
        return data; // Returns number of deleted rows
    }
};
