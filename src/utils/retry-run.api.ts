import { Logger } from 'src/utils/logger';

/**
 * Retry function for Monday.com API calls with exponential backoff
 * @param apiFn - The API function to retry
 * @param retries - Number of retry attempts (default: 3)
 * @param logger - Logger instance for logging retry attempts
 * @returns Promise<T> - The result of the API call
 */
export async function retryMondayApi<T>(
  apiFn: () => Promise<T>,
  retries = 3,
  logger?: Logger,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiFn();
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('socket hang up') && i < retries - 1) {
        const delay = 2000 * (i + 1); // Exponential backoff: 2s, 4s, 6s
        if (logger) {
          logger.warn(
            `Monday API call failed, retrying in ${delay}ms... (attempt ${i + 1}/${retries}): ${error.message}`,
          );
        } else {
          console.warn(
            `Monday API call failed, retrying in ${delay}ms... (attempt ${i + 1}/${retries}): ${error.message}`,
          );
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Retry logic failed - this should never be reached');
}
