import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner';

export type OptimizationType = 'products' | 'collections' | 'tags' | 'alt' | 'pages' | 'articles';

interface OptimizationState {
  type: OptimizationType | null;
  isRunning: boolean;
  current: number;
  total: number;
  operation: 'optimizing' | 'syncing';
  items: Array<{ id: string; title: string; status: 'pending' | 'success' | 'error' }>;
  cancelRequested: boolean;
  showDialog: boolean;
  showCompletedDialog: boolean;
}

interface BulkOperationResult {
  success: number;
  error: number;
  cancelled: boolean;
}

interface OptimizationContextType {
  state: OptimizationState;
  startOptimization: (type: OptimizationType, total: number, operation: 'optimizing' | 'syncing') => void;
  updateProgress: (current: number, itemId?: string, status?: 'success' | 'error') => void;
  completeOptimization: (showCompletedDialog?: boolean) => void;
  cancelOptimization: () => void;
  resetCancellation: () => void;
  toggleDialog: () => void;
  setShowDialog: (show: boolean) => void;
  setShowCompletedDialog: (show: boolean) => void;
  // NEW: Global bulk operation processor that continues even when components unmount
  processBulkOperation: <T>(
    type: OptimizationType,
    items: T[],
    processItem: (item: T, index: number) => Promise<boolean>,
    operation?: 'optimizing' | 'syncing',
    onComplete?: (results: BulkOperationResult) => void
  ) => Promise<BulkOperationResult>;
  isProcessing: boolean;
}

const OptimizationContext = createContext<OptimizationContextType | undefined>(undefined);

const initialState: OptimizationState = {
  type: null,
  isRunning: false,
  current: 0,
  total: 0,
  operation: 'optimizing',
  items: [],
  cancelRequested: false,
  showDialog: false,
  showCompletedDialog: false,
};

export function OptimizationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OptimizationState>(initialState);
  
  // Use ref for cancellation to avoid stale closure issues
  const cancelledRef = useRef(false);
  const isProcessingRef = useRef(false);

  const startOptimization = useCallback((type: OptimizationType, total: number, operation: 'optimizing' | 'syncing') => {
    cancelledRef.current = false;
    setState({
      type,
      isRunning: true,
      current: 0,
      total,
      operation,
      items: [],
      cancelRequested: false,
      showDialog: true,
      showCompletedDialog: false,
    });
  }, []);

  const updateProgress = useCallback((current: number, itemId?: string, status?: 'success' | 'error') => {
    setState(prev => {
      const newItems = [...prev.items];
      if (itemId && status) {
        const existingIndex = newItems.findIndex(item => item.id === itemId);
        if (existingIndex >= 0) {
          newItems[existingIndex] = { ...newItems[existingIndex], status };
        } else {
          newItems.push({ id: itemId, title: itemId, status });
        }
      }
      return {
        ...prev,
        current,
        items: newItems,
      };
    });
  }, []);

  const completeOptimization = useCallback((showCompletedDialog: boolean = true) => {
    isProcessingRef.current = false;
    setState(prev => ({
      ...prev,
      type: null, // Reset type to hide banner
      isRunning: false,
      showCompletedDialog: showCompletedDialog && prev.operation === 'optimizing' && prev.current > 0,
    }));
  }, []);

  const cancelOptimization = useCallback(() => {
    cancelledRef.current = true;
    setState(prev => ({
      ...prev,
      cancelRequested: true,
    }));
  }, []);

  const resetCancellation = useCallback(() => {
    cancelledRef.current = false;
    setState(prev => ({
      ...prev,
      cancelRequested: false,
    }));
  }, []);

  const toggleDialog = useCallback(() => {
    setState(prev => ({
      ...prev,
      showDialog: !prev.showDialog,
    }));
  }, []);

  const setShowDialog = useCallback((show: boolean) => {
    setState(prev => ({
      ...prev,
      showDialog: show,
    }));
  }, []);

  const setShowCompletedDialog = useCallback((show: boolean) => {
    setState(prev => ({
      ...prev,
      showCompletedDialog: show,
    }));
  }, []);

  // NEW: Global bulk operation processor - runs in context, survives component unmounts
  const processBulkOperation = useCallback(<T,>(
    type: OptimizationType,
    items: T[],
    processItem: (item: T, index: number) => Promise<boolean>,
    operation: 'optimizing' | 'syncing' = 'optimizing',
    onComplete?: (results: BulkOperationResult) => void
  ): Promise<BulkOperationResult> => {
    // Allow concurrent operations of DIFFERENT types
    // Only block if same type is already running
    if (isProcessingRef.current && state.type === type) {
      console.warn(`[OptimizationContext] ${type} operation already in progress`);
      toast.warning(`Une opération ${type} est déjà en cours. Veuillez patienter.`);
      return Promise.resolve({ success: 0, error: 0, cancelled: true });
    }

    // Reset cancellation flag
    cancelledRef.current = false;
    isProcessingRef.current = true;

    // Initialize state
    setState({
      type,
      isRunning: true,
      current: 0,
      total: items.length,
      operation,
      items: [],
      cancelRequested: false,
      showDialog: true,
      showCompletedDialog: false,
    });

    // Return a promise that resolves when the operation completes
    return new Promise((resolve) => {
      (async () => {
        let successCount = 0;
        let errorCount = 0;

        console.log(`[OptimizationContext] Starting ${operation} for ${items.length} ${type}`);

        try {
          for (let i = 0; i < items.length; i++) {
            // Check if cancellation was requested
            if (cancelledRef.current) {
              console.log(`[OptimizationContext] Cancelled at ${i + 1}/${items.length}`);
              break;
            }

            try {
              const success = await processItem(items[i], i);
              if (success) {
                successCount++;
              } else {
                errorCount++;
              }
            } catch (error) {
              console.error(`[OptimizationContext] Error processing item ${i}:`, error);
              errorCount++;
            }

            // Update progress in state
            setState(prev => ({
              ...prev,
              current: i + 1,
            }));
          }
        } finally {
          // ALWAYS reset processing flag, even on error
          isProcessingRef.current = false;
          
          setState(prev => ({
            ...prev,
            type: null,
            isRunning: false,
            showCompletedDialog: operation === 'optimizing' && successCount > 0,
          }));
        }

        const result: BulkOperationResult = {
          success: successCount,
          error: errorCount,
          cancelled: cancelledRef.current,
        };

        console.log(`[OptimizationContext] Completed: ${successCount} success, ${errorCount} errors, cancelled: ${cancelledRef.current}`);

        onComplete?.(result);
        resolve(result);
      })();
    });
  }, []);

  return (
    <OptimizationContext.Provider
      value={{
        state,
        startOptimization,
        updateProgress,
        completeOptimization,
        cancelOptimization,
        resetCancellation,
        toggleDialog,
        setShowDialog,
        setShowCompletedDialog,
        processBulkOperation,
        isProcessing: isProcessingRef.current,
      }}
    >
      {children}
    </OptimizationContext.Provider>
  );
}

export function useOptimization() {
  const context = useContext(OptimizationContext);
  if (!context) {
    throw new Error('useOptimization must be used within OptimizationProvider');
  }
  return context;
}
