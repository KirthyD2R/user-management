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

/**
 * Resolve a record's active status across the field-name variants the API may
 * use (isActive | active | is_active) and the value variants it may send
 * (boolean, 1/0, "true"/"active"). Defaults to active when no flag is present,
 * so a missing key never renders an otherwise-valid record as inactive.
 */
export function isRecordActive(record: any): boolean {
  const raw = record?.isActive ?? record?.active ?? record?.is_active;
  if (raw === undefined || raw === null) return true;
  if (typeof raw === 'string') {
    return ['true', '1', 'active', 'yes'].includes(raw.trim().toLowerCase());
  }
  return Boolean(raw);
}

/**
 * Normalize a user-like object so it always exposes a reliable boolean
 * `isActive`, regardless of which field/value variant the API returned.
 */
export function normalizeUser<T extends Record<string, any>>(user: T): T & { isActive: boolean } {
  return { ...user, isActive: isRecordActive(user) };
}
