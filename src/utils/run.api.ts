import { Logger } from 'src/utils/logger';

import { retryMondayApi } from './retry-run.api';

/**
 * Configuration options for batch API operations
 */
export interface BatchRunConfig {
  /** Maximum number of concurrent operations (default: 10) */
  concurrency?: number;
  /** Number of retry attempts per operation (default: 3) */
  retries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** Whether to stop on first error (default: false) */
  stopOnError?: boolean;
  /** Logger instance for logging progress */
  logger?: Logger;
}

/**
 * Result of a batch operation
 */
export interface BatchResult<T> {
  /** Whether the operation was successful */
  success: boolean;
  /** The result data if successful */
  data?: T;
  /** Error information if failed */
  error?: string;
  /** Index of the item in the original batch */
  index: number;
  /** Number of retry attempts made */
  retryAttempts: number;
}

/**
 * Summary of batch operation results
 */
export interface BatchSummary<T> {
  /** Total number of items processed */
  total: number;
  /** Number of successful operations */
  successful: number;
  /** Number of failed operations */
  failed: number;
  /** Success rate as a percentage */
  successRate: number;
  /** All individual results */
  results: BatchResult<T>[];
  /** Array of successful results only */
  successes: BatchResult<T>[];
  /** Array of failed results only */
  failures: BatchResult<T>[];
}

/**
 * Utility class for running batch API operations with concurrency control and retry logic
 */
export class BatchRunUtils {
  /**
   * Run multiple API operations in batches with concurrency control
   * @param items - Array of items to process
   * @param apiFunction - Function that performs the API call for each item
   * @param config - Configuration options
   * @returns Promise<BatchSummary<T>> - Summary of all operations
   */
  static async runBatch<TItem, TResult>(
    items: TItem[],
    apiFunction: (item: TItem, index: number) => Promise<TResult>,
    config: BatchRunConfig = {},
  ): Promise<BatchSummary<TResult>> {
    const {
      concurrency = 10,
      retries = 3,
      stopOnError = false,
      logger,
    } = config;

    if (items.length === 0) {
      return this.createEmptySummary<TResult>();
    }

    logger?.info(
      `Starting batch operation: ${items.length} items, concurrency: ${concurrency}`,
    );

    const results: BatchResult<TResult>[] = [];
    const batches = this.createBatches(items, concurrency);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      logger?.info(
        `Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`,
      );

      const batchPromises = batch.map(async ({ item, originalIndex }) => {
        let retryAttempts = 0;

        const result = await retryMondayApi(
          async () => {
            retryAttempts++;
            return await apiFunction(item, originalIndex);
          },
          retries,
          logger,
        );

        return {
          success: true,
          data: result,
          index: originalIndex,
          retryAttempts,
        } as BatchResult<TResult>;
      });

      // Execute batch with error handling
      const batchResults = await Promise.allSettled(batchPromises);

      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const { originalIndex } = batch[i];

        if (result.status === 'fulfilled') {
          results.push(result.value);
          logger?.debug(`Item ${originalIndex} completed successfully`);
        } else {
          const failureResult: BatchResult<TResult> = {
            success: false,
            error: result.reason?.message ?? 'Unknown error',
            index: originalIndex,
            retryAttempts: retries,
          };
          results.push(failureResult);
          logger?.error(`Item ${originalIndex} failed: ${failureResult.error}`);

          if (stopOnError) {
            logger?.warn('Stopping batch operation due to error');
            break;
          }
        }
      }

      if (stopOnError && results.some(r => !r.success)) {
        break;
      }

      // Add a small delay between batches to avoid overwhelming the API
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Sort results by original index
    results.sort((a, b) => a.index - b.index);

    const summary = this.createSummary(results);
    logger?.info(
      `Batch operation completed: ${summary.successful}/${summary.total} successful (${summary.successRate.toFixed(1)}%)`,
    );

    return summary;
  }

  /**
   * Run a single operation with retry logic
   * @param apiFunction - Function that performs the API call
   * @param config - Configuration options
   * @returns Promise<T> - Result of the API call
   */
  static async runSingle<T>(
    apiFunction: () => Promise<T>,
    config: BatchRunConfig = {},
  ): Promise<T> {
    const { retries = 3, logger } = config;

    return await retryMondayApi(apiFunction, retries, logger);
  }

  /**
   * Create batches from items array with original indices preserved
   */
  private static createBatches<T>(
    items: T[],
    batchSize: number,
  ): { item: T; originalIndex: number }[][] {
    const batches: { item: T; originalIndex: number }[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize).map((item, batchIndex) => ({
        item,
        originalIndex: i + batchIndex,
      }));
      batches.push(batch);
    }

    return batches;
  }

  /**
   * Create a summary from batch results
   */
  private static createSummary<T>(results: BatchResult<T>[]): BatchSummary<T> {
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    const successRate =
      results.length > 0 ? (successful / results.length) * 100 : 0;

    return {
      total: results.length,
      successful,
      failed,
      successRate,
      results,
      successes: results.filter(r => r.success),
      failures: results.filter(r => !r.success),
    };
  }

  /**
   * Create an empty summary for when no items are provided
   */
  private static createEmptySummary<T>(): BatchSummary<T> {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      successRate: 100,
      results: [],
      successes: [],
      failures: [],
    };
  }
}
