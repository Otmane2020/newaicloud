import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

  const startOptimization = useCallback((type: OptimizationType, total: number, operation: 'optimizing' | 'syncing') => {
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
    setState(prev => ({
      ...prev,
      isRunning: false,
      showCompletedDialog: showCompletedDialog && prev.operation === 'optimizing' && prev.current > 0,
    }));
  }, []);

  const cancelOptimization = useCallback(() => {
    setState(prev => ({
      ...prev,
      cancelRequested: true,
    }));
  }, []);

  const resetCancellation = useCallback(() => {
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
