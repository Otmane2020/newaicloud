import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { toast } from 'sonner';

export type OptimizationType = 'products' | 'collections' | 'tags' | 'alt' | 'pages' | 'articles';

// Individual operation state
export interface OperationState {
  isRunning: boolean;
  current: number;
  total: number;
  operation: 'optimizing' | 'syncing';
  items: Array<{ id: string; title: string; status: 'pending' | 'success' | 'error' }>;
  cancelRequested: boolean;
  startedAt: Date;
}

// Multi-operation state with backward-compatible computed properties
interface OptimizationState {
  operations: Map<OptimizationType, OperationState>;
  showDialog: boolean;
  activeDialogType: OptimizationType | null;
  showCompletedDialog: boolean;
  // Backward compatibility properties (computed from active operation)
  type: OptimizationType | null;
  isRunning: boolean;
  current: number;
  total: number;
  operation: 'optimizing' | 'syncing';
  items: Array<{ id: string; title: string; status: 'pending' | 'success' | 'error' }>;
  cancelRequested: boolean;
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
  cancelOptimization: (type?: OptimizationType) => void;
  resetCancellation: () => void;
  toggleDialog: () => void;
  setShowDialog: (show: boolean) => void;
  setShowCompletedDialog: (show: boolean) => void;
  processBulkOperation: <T>(
    type: OptimizationType,
    items: T[],
    processItem: (item: T, index: number) => Promise<boolean>,
    operation?: 'optimizing' | 'syncing',
    onComplete?: (results: BulkOperationResult) => void
  ) => Promise<BulkOperationResult>;
  isProcessing: boolean;
  getActiveOperations: () => [OptimizationType, OperationState][];
  isTypeRunning: (type: OptimizationType) => boolean;
  getOperationState: (type: OptimizationType) => OperationState | undefined;
}

const OptimizationContext = createContext<OptimizationContextType | undefined>(undefined);

// Helper to compute backward-compatible properties from operations map
function computeBackwardCompatProps(
  operations: Map<OptimizationType, OperationState>,
  activeType: OptimizationType | null
): Pick<OptimizationState, 'type' | 'isRunning' | 'current' | 'total' | 'operation' | 'items' | 'cancelRequested'> {
  // First try active type, then find any running operation
  const activeOp = activeType ? operations.get(activeType) : undefined;
  const runningEntry = activeOp?.isRunning 
    ? [activeType, activeOp] as [OptimizationType, OperationState]
    : Array.from(operations.entries()).find(([_, op]) => op.isRunning);
  
  if (runningEntry) {
    const [type, op] = runningEntry;
    return {
      type,
      isRunning: op.isRunning,
      current: op.current,
      total: op.total,
      operation: op.operation,
      items: op.items,
      cancelRequested: op.cancelRequested,
    };
  }
  
  // Check for any operation with progress (completed but still showing)
  const anyOp = activeType ? operations.get(activeType) : Array.from(operations.values())[0];
  if (anyOp) {
    return {
      type: activeType || Array.from(operations.keys())[0] || null,
      isRunning: anyOp.isRunning,
      current: anyOp.current,
      total: anyOp.total,
      operation: anyOp.operation,
      items: anyOp.items,
      cancelRequested: anyOp.cancelRequested,
    };
  }
  
  return {
    type: null,
    isRunning: false,
    current: 0,
    total: 0,
    operation: 'optimizing',
    items: [],
    cancelRequested: false,
  };
}

function createFullState(
  operations: Map<OptimizationType, OperationState>,
  showDialog: boolean,
  activeDialogType: OptimizationType | null,
  showCompletedDialog: boolean
): OptimizationState {
  const backwardProps = computeBackwardCompatProps(operations, activeDialogType);
  return {
    operations,
    showDialog,
    activeDialogType,
    showCompletedDialog,
    ...backwardProps,
  };
}

const initialState: OptimizationState = createFullState(new Map(), false, null, false);

export function OptimizationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OptimizationState>(initialState);
  
  const cancelledRefs = useRef<Map<OptimizationType, boolean>>(new Map());
  const isProcessingRefs = useRef<Map<OptimizationType, boolean>>(new Map());

  const startOptimization = useCallback((type: OptimizationType, total: number, operation: 'optimizing' | 'syncing') => {
    cancelledRefs.current.set(type, false);
    setState(prev => {
      const newOperations = new Map(prev.operations);
      newOperations.set(type, {
        isRunning: true,
        current: 0,
        total,
        operation,
        items: [],
        cancelRequested: false,
        startedAt: new Date(),
      });
      return createFullState(newOperations, true, type, false);
    });
  }, []);

  const updateProgress = useCallback((current: number, itemId?: string, status?: 'success' | 'error') => {
    setState(prev => {
      if (!prev.activeDialogType) return prev;
      
      const newOperations = new Map(prev.operations);
      const currentOp = newOperations.get(prev.activeDialogType);
      
      if (currentOp) {
        const newItems = [...currentOp.items];
        if (itemId && status) {
          const existingIndex = newItems.findIndex(item => item.id === itemId);
          if (existingIndex >= 0) {
            newItems[existingIndex] = { ...newItems[existingIndex], status };
          } else {
            newItems.push({ id: itemId, title: itemId, status });
          }
        }
        
        newOperations.set(prev.activeDialogType, {
          ...currentOp,
          current,
          items: newItems,
        });
      }
      
      return createFullState(newOperations, prev.showDialog, prev.activeDialogType, prev.showCompletedDialog);
    });
  }, []);

  const completeOptimization = useCallback((showCompletedDialog: boolean = true) => {
    setState(prev => {
      if (!prev.activeDialogType) return prev;
      
      const type = prev.activeDialogType;
      isProcessingRefs.current.set(type, false);
      
      const newOperations = new Map(prev.operations);
      const currentOp = newOperations.get(type);
      
      if (currentOp) {
        newOperations.set(type, {
          ...currentOp,
          isRunning: false,
        });
        
        setTimeout(() => {
          setState(s => {
            const ops = new Map(s.operations);
            ops.delete(type);
            return createFullState(ops, s.showDialog, s.activeDialogType, s.showCompletedDialog);
          });
        }, 3000);
      }
      
      const shouldShowCompleted = showCompletedDialog && currentOp?.operation === 'optimizing' && (currentOp?.current || 0) > 0;
      return createFullState(newOperations, prev.showDialog, prev.activeDialogType, shouldShowCompleted);
    });
  }, []);

  const cancelOptimization = useCallback((type?: OptimizationType) => {
    setState(prev => {
      const targetType = type || prev.activeDialogType;
      if (!targetType) return prev;
      
      cancelledRefs.current.set(targetType, true);
      
      const newOperations = new Map(prev.operations);
      const currentOp = newOperations.get(targetType);
      
      if (currentOp) {
        newOperations.set(targetType, {
          ...currentOp,
          cancelRequested: true,
        });
      }
      
      return createFullState(newOperations, prev.showDialog, prev.activeDialogType, prev.showCompletedDialog);
    });
  }, []);

  const resetCancellation = useCallback(() => {
    setState(prev => {
      if (!prev.activeDialogType) return prev;
      
      cancelledRefs.current.set(prev.activeDialogType, false);
      
      const newOperations = new Map(prev.operations);
      const currentOp = newOperations.get(prev.activeDialogType);
      
      if (currentOp) {
        newOperations.set(prev.activeDialogType, {
          ...currentOp,
          cancelRequested: false,
        });
      }
      
      return createFullState(newOperations, prev.showDialog, prev.activeDialogType, prev.showCompletedDialog);
    });
  }, []);

  const toggleDialog = useCallback(() => {
    setState(prev => createFullState(prev.operations, !prev.showDialog, prev.activeDialogType, prev.showCompletedDialog));
  }, []);

  const setShowDialog = useCallback((show: boolean) => {
    setState(prev => createFullState(prev.operations, show, prev.activeDialogType, prev.showCompletedDialog));
  }, []);

  const setShowCompletedDialog = useCallback((show: boolean) => {
    setState(prev => createFullState(prev.operations, prev.showDialog, prev.activeDialogType, show));
  }, []);

  const processBulkOperation = useCallback(<T,>(
    type: OptimizationType,
    items: T[],
    processItem: (item: T, index: number) => Promise<boolean>,
    operation: 'optimizing' | 'syncing' = 'optimizing',
    onComplete?: (results: BulkOperationResult) => void
  ): Promise<BulkOperationResult> => {
    if (isProcessingRefs.current.get(type)) {
      console.warn(`[OptimizationContext] ${type} operation already in progress`);
      toast.warning(`Une opération ${type} est déjà en cours. Veuillez patienter.`);
      return Promise.resolve({ success: 0, error: 0, cancelled: true });
    }

    cancelledRefs.current.set(type, false);
    isProcessingRefs.current.set(type, true);

    setState(prev => {
      const newOperations = new Map(prev.operations);
      newOperations.set(type, {
        isRunning: true,
        current: 0,
        total: items.length,
        operation,
        items: [],
        cancelRequested: false,
        startedAt: new Date(),
      });
      return createFullState(newOperations, true, type, false);
    });

    return new Promise((resolve) => {
      (async () => {
        let successCount = 0;
        let errorCount = 0;

        console.log(`[OptimizationContext] Starting ${operation} for ${items.length} ${type}`);

        try {
          for (let i = 0; i < items.length; i++) {
            if (cancelledRefs.current.get(type)) {
              console.log(`[OptimizationContext] ${type} cancelled at ${i + 1}/${items.length}`);
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
              console.error(`[OptimizationContext] Error processing ${type} item ${i}:`, error);
              errorCount++;
            }

            setState(prev => {
              const newOperations = new Map(prev.operations);
              const currentOp = newOperations.get(type);
              if (currentOp) {
                newOperations.set(type, {
                  ...currentOp,
                  current: i + 1,
                });
              }
              return createFullState(newOperations, prev.showDialog, prev.activeDialogType, prev.showCompletedDialog);
            });
          }
        } finally {
          isProcessingRefs.current.set(type, false);
          
          setState(prev => {
            const newOperations = new Map(prev.operations);
            const currentOp = newOperations.get(type);
            
            if (currentOp) {
              newOperations.set(type, {
                ...currentOp,
                isRunning: false,
              });
              
              setTimeout(() => {
                setState(s => {
                  const ops = new Map(s.operations);
                  ops.delete(type);
                  return createFullState(ops, s.showDialog, s.activeDialogType, s.showCompletedDialog);
                });
              }, 5000);
            }
            
            const shouldShowCompleted = operation === 'optimizing' && successCount > 0;
            return createFullState(newOperations, prev.showDialog, prev.activeDialogType, shouldShowCompleted);
          });
        }

        const result: BulkOperationResult = {
          success: successCount,
          error: errorCount,
          cancelled: cancelledRefs.current.get(type) || false,
        };

        console.log(`[OptimizationContext] ${type} completed: ${successCount} success, ${errorCount} errors, cancelled: ${result.cancelled}`);

        onComplete?.(result);
        resolve(result);
      })();
    });
  }, []);

  const getActiveOperations = useCallback((): [OptimizationType, OperationState][] => {
    return Array.from(state.operations.entries()).filter(([_, op]) => op.isRunning || op.current > 0);
  }, [state.operations]);

  const isTypeRunning = useCallback((type: OptimizationType): boolean => {
    return isProcessingRefs.current.get(type) || false;
  }, []);

  const getOperationState = useCallback((type: OptimizationType): OperationState | undefined => {
    return state.operations.get(type);
  }, [state.operations]);

  const isProcessing = Array.from(isProcessingRefs.current.values()).some(v => v);

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
        isProcessing,
        getActiveOperations,
        isTypeRunning,
        getOperationState,
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
