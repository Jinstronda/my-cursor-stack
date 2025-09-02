import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { getUserProfile } from "./auth-utils";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function refreshAuth(): Promise<boolean> {
  try {
    if (!supabase) return false;
    
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return false;
    
    // Use RPC function instead of HTTP endpoint
    const userData = await getUserProfile();
    return !!userData;
  } catch {
    return false;
  }
}

export async function apiFormRequest(
  method: string,
  url: string,
  formData: FormData,
): Promise<Response> {
  const makeRequest = async () => {
    const headers: Record<string, string> = {};
    
    // Do NOT set Content-Type for FormData - let browser set it with boundary
    
    // Add Supabase JWT token if available
    if (supabase) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
    }
    
    return await fetch(url, {
      method,
      headers,
      body: formData,
      credentials: "include",
    });
  };

  let res = await makeRequest();

  // If we get 401 and it's not the auth endpoint itself, try to refresh auth once
  if (res.status === 401 && !url.includes('/api/auth/')) {
    console.log("Got 401, attempting to refresh auth...");
    const authRefreshed = await refreshAuth();
    
    if (authRefreshed) {
      console.log("Auth refreshed successfully, retrying request...");
      res = await makeRequest();
    } else {
      console.log("Auth refresh failed, proceeding with original error");
    }
  }

  await throwIfResNotOk(res);
  return res;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const makeRequest = async () => {
    const headers: Record<string, string> = {};
    
    if (data) {
      headers["Content-Type"] = "application/json";
    }
    
    // Add Supabase JWT token if available
    if (supabase) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
    }
    
    return await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  };

  let res = await makeRequest();

  // If we get 401 and it's not the auth endpoint itself, try to refresh auth once
  if (res.status === 401 && !url.includes('/api/auth/')) {
    console.log("Got 401, attempting to refresh auth...");
    const authRefreshed = await refreshAuth();
    
    if (authRefreshed) {
      console.log("Auth refreshed successfully, retrying request...");
      res = await makeRequest();
    } else {
      console.log("Auth refresh failed, proceeding with original error");
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add Supabase JWT token if available
    if (supabase) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
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
