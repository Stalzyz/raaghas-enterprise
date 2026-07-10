/**
 * Centralized API configuration for the Raaghas Storefront.
 * Ensures we always fall back to the production API domain if environment variables are missing.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? "http://localhost:6005" : "https://api.raaghas.in");

export const getApiUrl = (path: string) => {
  let cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!cleanPath.startsWith('/api/v1')) {
    cleanPath = `/api/v1${cleanPath}`;
  }
  return `${API_URL}${cleanPath}`;
};
