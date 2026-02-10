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
        // Log the error to an error reporting service
        logger.error('Unhandled application error', {
            message: error.message,
            stack: error.stack,
            digest: error.digest
        });
    }, [error]);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div className="bg-red-900/10 border border-red-500/20 p-8 rounded-lg max-w-md w-full text-center space-y-4">
                <h2 className="text-2xl font-bold text-red-400">Something went wrong!</h2>
                <p className="text-white/60 text-sm">
                    We've logged this issue and our team has been notified.
                </p>
                <div className="bg-black/40 p-3 rounded text-left text-xs text-red-300 font-mono overflow-auto max-h-32">
                    {error.message}
                </div>
                <button
                    onClick={
                        // Attempt to recover by trying to re-render the segment
                        () => reset()
                    }
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition w-full"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
