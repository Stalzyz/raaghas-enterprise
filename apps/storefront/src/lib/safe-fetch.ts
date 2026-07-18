import { API_URL } from "./api";

interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

interface SafeFetchResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * A bulletproof fetch wrapper that handles:
 * 1. Automatic retries for network failures
 * 2. Strict timeouts (prevents hanging SSR)
 * 3. Graceful JSON parsing
 * 4. Never throws unhandled exceptions (always returns { data, error })
 */
export async function safeFetch<T = any>(
  path: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  const { timeoutMs = 8000, retries = 2, ...fetchOptions } = options;
  
  // Clean path and ensure it's absolute
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!cleanPath.startsWith('/api/v1')) {
    cleanPath = `/api/v1${cleanPath}`;
  }
  const url = cleanPath.startsWith('http') ? cleanPath : `${API_URL}${cleanPath}`;

  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const headers = new Headers(fetchOptions.headers || {});
      if (typeof window === 'undefined') {
        headers.set('x-internal-secret', process.env.INTERNAL_API_SECRET || 'raaghas_internal_bypass_99x');
      }

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal as AbortSignal,
      });

      clearTimeout(timeoutId);

      // If the API returns a 5xx, we might want to retry. If 4xx, it's a permanent error.
      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          throw new Error(`Server Error ${response.status}`);
        }
        
        let errorMsg = `HTTP Error ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch {
          // ignore parsing error for non-json body
        }
        
        return { data: null, error: errorMsg, status: response.status };
      }

      const data = await response.json();
      return { data, error: null, status: response.status };

    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (attempt >= retries) {
          return { data: null, error: `Request timed out after ${timeoutMs}ms`, status: 408 };
        }
      } else if (attempt >= retries) {
        return { data: null, error: err.message || 'Network failure', status: 0 };
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }

  return { data: null, error: 'Unknown failure', status: 0 };
}
