import { Injectable } from '@nestjs/common';
import { Logger } from 'src/utils/logger';
import { MondayAccessToken } from './dto/monday-access-token.dto';

interface CacheEntry {
    token: MondayAccessToken;
    expiresAt: number;
}

@Injectable()
export class TokenCacheService {
    private readonly logger = new Logger(TokenCacheService.name);
    private readonly cache = new Map<string, CacheEntry>();
    private readonly CACHE_DURATION_MS = 100 * 60 * 1000; // 100 minutes in milliseconds

    constructor() {
        // Clean up expired entries every 30 minutes
        this.startCleanupInterval();
    }

    /**
     * Store access token in RAM cache
     * @param accountId Account ID to use as cache key
     * @param token Monday access token to cache
     */
    set(accountId: string, token: MondayAccessToken): void {
        const expiresAt = Date.now() + this.CACHE_DURATION_MS;

        this.cache.set(accountId, {
            token,
            expiresAt,
        });

        this.logger.info(
            `Access token cached for account: ${accountId}, expires at: ${new Date(expiresAt).toISOString()}`,
        );
    }

    /**
     * Get access token from RAM cache
     * @param accountId Account ID to lookup
     * @returns Monday access token if found and not expired, null otherwise
     */
    get(accountId: string): MondayAccessToken | null {
        const entry = this.cache.get(accountId);

        if (!entry) {
            this.logger.debug(`No cached token found for account: ${accountId}`);
            return null;
        }

        // Check if token has expired
        if (Date.now() > entry.expiresAt) {
            this.logger.info(`Cached token expired for account: ${accountId}`);
            this.cache.delete(accountId);
            return null;
        }

        this.logger.debug(`Retrieved cached token for account: ${accountId}`);
        return entry.token;
    }

    /**
     * Remove access token from cache
     * @param accountId Account ID to remove
     */
    delete(accountId: string): boolean {
        const deleted = this.cache.delete(accountId);
        if (deleted) {
            this.logger.info(`Removed cached token for account: ${accountId}`);
        }
        return deleted;
    }

    /**
     * Clear all cached tokens
     */
    clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        this.logger.info(`Cleared all cached tokens, removed ${size} entries`);
    }

    /**
     * Get cache statistics
     */
    getStats(): { totalEntries: number; expiredEntries: number } {
        const now = Date.now();
        let expiredEntries = 0;

        for (const [, entry] of this.cache) {
            if (now > entry.expiresAt) {
                expiredEntries++;
            }
        }

        return {
            totalEntries: this.cache.size,
            expiredEntries,
        };
    }

    /**
     * Start periodic cleanup of expired entries
     */
    private startCleanupInterval(): void {
        setInterval(
            () => {
                this.cleanupExpiredEntries();
            },
            30 * 60 * 1000,
        ); // Run every 30 minutes
    }

    /**
     * Remove expired entries from cache
     */
    private cleanupExpiredEntries(): void {
        const now = Date.now();
        let removedCount = 0;

        for (const [accountId, entry] of this.cache) {
            if (now > entry.expiresAt) {
                this.cache.delete(accountId);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            this.logger.info(`Cleaned up ${removedCount} expired token entries`);
        }
    }
}
