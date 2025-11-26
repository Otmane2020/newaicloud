import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProgressState {
  current: number;
  total: number;
  action?: string;
}

interface OptimizationProgressContextType {
  progress: ProgressState | null;
  setProgress: (progress: ProgressState | null) => void;
  isOptimizing: boolean;
  setIsOptimizing: (isOptimizing: boolean) => void;
}

const OptimizationProgressContext = createContext<OptimizationProgressContextType | undefined>(undefined);

export function OptimizationProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  return (
    <OptimizationProgressContext.Provider
      value={{
        progress,
        setProgress,
        isOptimizing,
        setIsOptimizing,
      }}
    >
      {children}
    </OptimizationProgressContext.Provider>
  );
}

export function useOptimizationProgress() {
  const context = useContext(OptimizationProgressContext);
  if (context === undefined) {
    throw new Error('useOptimizationProgress must be used within OptimizationProgressProvider');
  }
  return context;
}
