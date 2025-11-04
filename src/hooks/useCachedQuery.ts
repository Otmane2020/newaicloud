import { useQuery, useQueryClient, QueryKey } from '@tanstack/react-query';

interface CachedQueryOptions<T> {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
  enabled?: boolean;
}

export function useCachedQuery<T>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // 5 minutes par défaut
  cacheTime = 10 * 60 * 1000, // 10 minutes par défaut
  enabled = true,
}: CachedQueryOptions<T>) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn,
    staleTime,
    gcTime: cacheTime,
    enabled,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const refetch = () => {
    return query.refetch();
  };

  return {
    ...query,
    invalidate,
    refetch,
  };
}

// Hook spécifique pour les stats du dashboard
export function useDashboardStats(userId: string | undefined) {
  return useCachedQuery({
    queryKey: ['dashboard-stats', userId],
    queryFn: async () => {
      // Cette fonction sera appelée par le composant Dashboard
      return null;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes pour les stats
  });
}
