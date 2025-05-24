import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface SessionUser {
  // Match the backend SessionUser interface
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  [key: string]: any;
}

interface SessionResponse {
  user: SessionUser | null;
  error?: string;
}

/**
 * Hook to access the current user's session information
 */
export function useSession() {
  const { data, isLoading, error, refetch } = useQuery<SessionResponse>({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) {
        throw new Error('Failed to fetch session');
      }
      return res.json();
    },
    // Don't refetch on window focus as the session rarely changes during active use
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    session: data?.user || null,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
    refetch,
  };
}
