/**
 * Simple IP-based rate limiter.
 * Tracks request counts per key and resets on a configurable interval.
 */
export class IpRateLimiter {
    private readonly counts = new Map<string, number>();

    constructor(private readonly limit: number) {}

    /**
     * Returns true if the request is allowed, false if rate limit is exceeded.
     * Increments the count for the given key when allowed.
     */
    isAllowed(key: string): boolean {
        const count = this.counts.get(key) ?? 0;
        if (count >= this.limit) return false;
        this.counts.set(key, count + 1);
        return true;
    }

    reset(): void {
        this.counts.clear();
    }
}
