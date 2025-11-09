import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UsePaginatedSeoOptions<T> {
  items: T[];
  itemsPerPage?: number;
  cacheKey: string;
}

export function usePaginatedSeo<T>({ items, itemsPerPage = 50, cacheKey }: UsePaginatedSeoOptions<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Calculate pagination
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    return items.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [items, currentPage, itemsPerPage]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Cache the current page data
  useEffect(() => {
    queryClient.setQueryData([cacheKey, currentPage], paginatedItems);
  }, [paginatedItems, currentPage, cacheKey, queryClient]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}
