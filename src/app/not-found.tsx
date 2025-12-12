'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import Link from 'next/link';

export default function NotFound() {
    useEffect(() => {
        logger.log('Page Not Found (404)', 'ROUTING', 'warning');
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Page Not Found</h2>
            <p className="text-gray-600 mb-8">Could not find requested resource</p>
            <Link
                href="/"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                Return Home
            </Link>
        </div>
    );
}
