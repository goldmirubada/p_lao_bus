'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        logger.log(error, 'REACT_RENDER', 'error', {
            metadata: { digest: error.digest }
        });
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Something went wrong!</h2>
            <button
                onClick={() => reset()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                Try again
            </button>
        </div>
    );
}
