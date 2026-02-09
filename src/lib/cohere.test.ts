import { describe, it, expect, vi, afterEach } from 'vitest'
import { withRetry } from './cohere'

describe('withRetry Utility', () => {
    // Mock console.warn to suppress logs during tests
    vi.spyOn(console, 'warn').mockImplementation(() => { });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should succeed on first attempt if no error occurs', async () => {
        const mockFn = vi.fn().mockResolvedValue('success');
        const result = await withRetry(mockFn);

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 Rate Limit error', async () => {
        const error429 = new Error('Rate limit');
        (error429 as any).statusCode = 429;

        const mockFn = vi.fn()
            .mockRejectedValueOnce(error429)
            .mockResolvedValue('success');

        // Use small base delay for faster tests
        const result = await withRetry(mockFn, 3, 10);

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 Server error', async () => {
        const error500 = new Error('Server error');
        (error500 as any).statusCode = 500;

        const mockFn = vi.fn()
            .mockRejectedValueOnce(error500)
            .mockResolvedValue('success');

        const result = await withRetry(mockFn, 3, 10);

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on IPv6 network error (EHOSTUNREACH)', async () => {
        const networkError = new Error('connect EHOSTUNREACH 2607:f8b0:4006:81a::200e:443');
        (networkError as any).code = 'EHOSTUNREACH';

        const mockFn = vi.fn()
            .mockRejectedValueOnce(networkError)
            .mockResolvedValue('success');

        const result = await withRetry(mockFn, 3, 10);

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 400 Bad Request', async () => {
        const error400 = new Error('Bad Request');
        (error400 as any).statusCode = 400;

        const mockFn = vi.fn().mockRejectedValue(error400);

        await expect(withRetry(mockFn, 3, 10)).rejects.toThrow('Bad Request');
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries are exhausted', async () => {
        const error500 = new Error('Server error');
        (error500 as any).statusCode = 500;

        const mockFn = vi.fn().mockRejectedValue(error500);

        await expect(withRetry(mockFn, 3, 10)).rejects.toThrow('Server error');
        expect(mockFn).toHaveBeenCalledTimes(3);
    });
});
