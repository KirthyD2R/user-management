/**
 * Extract a human-readable error message from an Axios error, regardless of the
 * shape the API used. Tries (in order): nested error.message, error string,
 * top-level message, validation `errors` arrays/objects, raw string body, the
 * Axios error message, then a status-based fallback.
 */
export function getErrorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  const data = err?.response?.data;

  if (typeof data === 'string' && data.trim()) return data;

  if (data && typeof data === 'object') {
    // { message: "..." } or { error: "..." } / { error: { message: "..." } }
    if (typeof data.message === 'string' && data.message.trim()) return data.message;
    if (typeof data.error === 'string' && data.error.trim()) return data.error;
    if (typeof data.error?.message === 'string' && data.error.message.trim()) return data.error.message;
    if (typeof data.data?.message === 'string' && data.data.message.trim()) return data.data.message;

    // Validation errors: array of strings / {message|msg} objects, or a field->messages map
    const errors = data.errors ?? data.error?.errors;
    if (Array.isArray(errors) && errors.length) {
      const msgs = errors
        .map((e: any) => (typeof e === 'string' ? e : e?.message || e?.msg))
        .filter(Boolean);
      if (msgs.length) return msgs.join('\n');
    } else if (errors && typeof errors === 'object') {
      const msgs = Object.values(errors)
        .flat()
        .map((e: any) => (typeof e === 'string' ? e : e?.message || e?.msg))
        .filter(Boolean);
      if (msgs.length) return msgs.join('\n');
    }
  }

  // Network / CORS / timeout errors never reach a response body
  if (typeof err?.message === 'string' && err.message.trim() && err.message !== 'Network Error') {
    return err.message;
  }
  if (err?.message === 'Network Error') return 'Network error — please check your connection and try again.';

  const status = err?.response?.status;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource was not found.';
  if (status >= 500) return 'Server error — please try again shortly.';

  return fallback;
}

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
