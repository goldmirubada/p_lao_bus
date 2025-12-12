import { logger } from '@/lib/logger';

interface FetchOptions extends RequestInit {
    timeout?: number;
}

export async function apiFetch(url: string, options: FetchOptions = {}): Promise<Response> {
    const { timeout = 10000, ...fetchOptions } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });

        clearTimeout(id);

        if (!response.ok) {
            // 4xx or 5xx error
            const body = await response.text().catch(() => 'No Body');

            logger.log(
                `API Error: ${response.status} ${response.statusText} - ${url}`,
                response.status >= 500 ? 'API_SERVER' : 'API_NET', // 5xx = Server, 4xx = Net/Client (simplified)
                response.status >= 500 ? 'error' : 'warning',
                {
                    metadata: {
                        status: response.status,
                        statusText: response.statusText,
                        url,
                        method: options.method || 'GET',
                        responseBody: body.substring(0, 500), // Truncate
                    }
                }
            );
        }

        return response;

    } catch (error: any) {
        clearTimeout(id);

        // Network error or Timeout
        const isTimeout = error.name === 'AbortError';

        logger.log(
            isTimeout ? `API Timeout (${timeout}ms): ${url}` : `API Network Error: ${url}`,
            'API_NET',
            'error',
            {
                metadata: {
                    url,
                    method: options.method || 'GET',
                    errorMessage: error.message,
                    isTimeout
                }
            }
        );

        throw error;
    }
}
