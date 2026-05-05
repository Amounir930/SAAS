
/**
 * Generic API Fetcher
 * Standardizes error handling and response parsing across the application.
 */
export async function fetchApi<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Fallback to status text if JSON parsing fails
      errorMessage = response.statusText || errorMessage;
    }
    
    const error = new Error(errorMessage) as any;
    error.status = response.status;
    throw error;
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
