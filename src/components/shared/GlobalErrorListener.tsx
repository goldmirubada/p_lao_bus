'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export function GlobalErrorListener() {
    useEffect(() => {
        // 1. Global JS Errors (Uncaught Exceptions)
        const handleWindowError = (event: ErrorEvent) => {
            logger.log(event.error || event.message, 'JAVASCRIPT', 'error', {
                metadata: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                }
            });
        };

        // 2. Unhandled Promise Rejections (Async Errors)
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            logger.log(event.reason, 'JAVASCRIPT', 'error', {
                metadata: {
                    type: 'UnhandledRejection',
                }
            });
        };

        // 3. Resource Loading Errors (Images, Scripts, CSS)
        // capture: true is REQUIRED for error events on elements
        const handleResourceError = (event: Event) => {
            const target = event.target as HTMLElement;
            // Only capture element errors (not window errors bubble up, though error events don't usually bubble)
            if (target && target !== window as any) {
                const url = (target as any).src || (target as any).href;
                if (url) {
                    logger.log(`Failed to load resource: ${url}`, 'RESOURCE_LOAD', 'warning', {
                        metadata: {
                            tagName: target.tagName,
                            id: target.id,
                            className: target.className,
                            resource_url: url
                        }
                    });
                }
            }
        };

        window.addEventListener('error', handleWindowError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        // Use capture phase for resource errors
        window.addEventListener('error', handleResourceError, true);

        // 4. Google Maps Auth Failure
        (window as any).gm_authFailure = () => {
            logger.log('Google Maps Authorization Failure', 'GOOGLE_MAPS', 'error');
        };

        return () => {
            window.removeEventListener('error', handleWindowError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('error', handleResourceError, true);
        };
    }, []);

    return null; // This component renders nothing
}
