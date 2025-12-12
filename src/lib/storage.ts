import { logger } from "@/lib/logger";

export const safeStorage = {
    setItem(key: string, value: string): void {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, value);
            }
        } catch (e: any) {
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                logger.log('LocalStorage Quota Exceeded', 'STORAGE', 'error', {
                    metadata: { key, valueLength: value.length }
                });
            } else {
                logger.log(e, 'STORAGE', 'warning', { metadata: { key } });
            }
        }
    },

    getItem(key: string): string | null {
        try {
            if (typeof window !== 'undefined') {
                return localStorage.getItem(key);
            }
        } catch (e) {
            logger.log(e, 'STORAGE', 'warning', { metadata: { method: 'getItem', key } });
        }
        return null;
    },

    removeItem(key: string): void {
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }
        } catch (e) {
            logger.log(e, 'STORAGE', 'warning', { metadata: { method: 'removeItem', key } });
        }
    }
};
