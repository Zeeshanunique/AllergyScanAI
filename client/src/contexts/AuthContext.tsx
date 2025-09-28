import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { tokenStorage } from '@/lib/auth';
import type { User, RegisterData, LoginData } from '@shared/schema';

type AuthUser = Omit<User, 'passwordHash'>;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Initialize auth state from stored token
  useEffect(() => {
    const token = tokenStorage.get();
    if (token) {
      // If we have a token, the user query will attempt to fetch user data
      setIsInitialized(true);
    } else {
      // No token means no user
      setUser(null);
      setIsInitialized(true);
    }
  }, []);

  // Get current user - only when we have a token and are initialized
  const {
    data: userResponse,
    isLoading: isUserLoading,
    error,
    refetch: refetchUser
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/me', undefined, { on401: 'returnNull' });
      if (response === null) return null;
      return response.json();
    },
    enabled: isInitialized && !!tokenStorage.get(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isLoading = !isInitialized || isUserLoading;

  // Update user state when query data changes
  useEffect(() => {
    if (userResponse?.user) {
      setUser(userResponse.user);
    } else if (error || userResponse === null) {
      setUser(null);
      // Clear invalid token
      if (error || userResponse === null) {
        tokenStorage.clear();
      }
    }
  }, [userResponse, error]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      if (!response) {
        throw new Error('Login failed');
      }
      return response.json();
    },
    onSuccess: (result) => {
      // Store the token
      if (result.token) {
        tokenStorage.set(result.token);
      }
      setUser(result.user);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.clear(); // Clear all cached data for fresh start
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiRequest('POST', '/api/auth/register', data);
      if (!response) {
        throw new Error('Registration failed');
      }
      return response.json();
    },
    onSuccess: (result) => {
      // Store the token
      if (result.token) {
        tokenStorage.set(result.token);
      }
      setUser(result.user);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.clear(); // Clear all cached data for fresh start
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout');
      return response?.json();
    },
    onSuccess: () => {
      tokenStorage.clear();
      setUser(null);
      queryClient.clear(); // Clear all cached data
    },
    onError: () => {
      // Even if logout fails on server, clear local state
      tokenStorage.clear();
      setUser(null);
      queryClient.clear();
    },
  });

  const login = async (data: LoginData) => {
    await loginMutation.mutateAsync(data);
  };

  const register = async (data: RegisterData) => {
    await registerMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refetchUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}