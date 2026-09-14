import type { AccountSummary } from '@baby-growth-gallery/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, type PropsWithChildren } from 'react';
import { api } from './api';

interface AuthContextValue {
  account: AccountSummary | null;
  isLoading: boolean;
  setAccount(account: AccountSummary | null): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const sessionKey = ['auth-session'] as const;

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: sessionKey,
    queryFn: () => api.getSession(),
    retry: false,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  return (
    <AuthContext.Provider
      value={{
        account: session.isError ? null : (session.data ?? null),
        isLoading: session.isPending,
        setAccount(account) {
          if (!account) {
            queryClient.removeQueries({ queryKey: ['families'] });
            queryClient.removeQueries({ queryKey: ['family'] });
          }
          queryClient.setQueryData(sessionKey, account);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// This hook intentionally shares the provider's private context.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
