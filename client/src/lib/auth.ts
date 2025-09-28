// Token management utilities for client-side authentication

const TOKEN_KEY = 'allergyguard_token';

export const tokenStorage = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  set(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  remove(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },

  clear(): void {
    this.remove();
  }
};

export function getAuthHeaders(): HeadersInit {
  const token = tokenStorage.get();
  if (!token) return {};
  
  return {
    'Authorization': `Bearer ${token}`
  };
}
