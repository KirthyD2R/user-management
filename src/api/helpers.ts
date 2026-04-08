/**
 * Safely extract an array from an API response, regardless of nesting.
 * Handles: raw array, {data: [...]}, {data: {data: [...]}}, etc.
 */
export function extractArray<T>(response: any): T[] {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.data?.data && Array.isArray(response.data.data)) return response.data.data;
  // Handle {data: {someKey: [...]}} — find first array value inside data
  if (response?.data && typeof response.data === 'object') {
    for (const key of Object.keys(response.data)) {
      if (Array.isArray(response.data[key])) return response.data[key];
    }
  }
  return [];
}

/**
 * Safely extract a single object from an API response.
 */
export function extractData<T>(response: any): T {
  if (response?.data?.data) return response.data.data;
  if (response?.data) return response.data;
  return response;
}

/**
 * Extract pagination info from API response.
 */
export function extractPagination(response: any) {
  return response?.pagination || response?.data?.pagination || { page: 1, totalPages: 1, total: 0 };
}
