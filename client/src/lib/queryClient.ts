import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle authentication errors specially
    if (res.status === 401) {
      console.warn("Auth error detected in API request, clearing local storage");
      localStorage.removeItem('gmail_app_user');
      
      try {
        // Try to parse the response to see if it contains a token_expired error
        const errorText = await res.text();
        let errorObj = {};
        try {
          errorObj = JSON.parse(errorText);
        } catch (e) {
          // Not JSON, use the text directly
        }
        
        // Include special error_type for 401s so they can be handled differently
        throw new Error(`${res.status}: ${errorText}`, { 
          cause: { 
            status: 401, 
            error_type: 'auth_error',
            ...errorObj
          } 
        });
      } catch (e) {
        // If we can't parse the response, just throw a generic auth error
        throw new Error(`${res.status}: Authentication failed`, { 
          cause: { status: 401, error_type: 'auth_error' } 
        });
      }
    }
    
    // Handle all other errors
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check if we have a user in localStorage
  let hasLocalStorage = true;
  let hasLocalUser = false;
    
  try {
    hasLocalUser = localStorage.getItem("gmail_app_user") !== null;
  } catch (e) {
    console.warn("LocalStorage not available in apiRequest, operating in VM mode");
    hasLocalStorage = false;
    // In VM environment, we'll assume the user exists
    hasLocalUser = true;
  }

  // Setup headers
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // If we have a local user, add a demo mode header to help the server
  if (hasLocalUser) {
    headers["X-Demo-Mode"] = "true";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Check if we have a user in localStorage
    let hasLocalStorage = true;
    let hasLocalUser = false;
    
    try {
      hasLocalUser = localStorage.getItem("gmail_app_user") !== null;
    } catch (e) {
      console.warn("LocalStorage not available, operating in VM mode");
      hasLocalStorage = false;
      // In VM environment, we'll assume the user exists
      hasLocalUser = true;
    }
    
    // If we have a local user, add demo mode headers
    const headers: Record<string, string> = {};
    if (hasLocalUser) {
      headers["X-Demo-Mode"] = "true";
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
