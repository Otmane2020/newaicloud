import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';

interface AutoSyncContextType {
  isSyncing: boolean;
  isCompleted: boolean;
  currentType: string;
  storeName: string;
  itemsSynced: number;
  startSync: (storeName: string) => void;
  updateProgress: (type: string, items: number) => void;
  completeSync: (itemsSynced: number) => void;
  endSync: () => void;
}

const AutoSyncContext = createContext<AutoSyncContextType | undefined>(undefined);
const COMPLETION_DISPLAY_MS = 1800;

export function AutoSyncProvider({ children }: { children: ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentType, setCurrentType] = useState('products');
  const [storeName, setStoreName] = useState('');
  const [itemsSynced, setItemsSynced] = useState(0);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearAutoClose = useCallback(() => {
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    setIsSyncing(false);
    setIsCompleted(false);
    setCurrentType('products');
    setStoreName('');
    setItemsSynced(0);
  }, []);

  const startSync = useCallback((name: string) => {
    clearAutoClose();
    setStoreName(name);
    setIsSyncing(true);
    setIsCompleted(false);
    setCurrentType('products');
    setItemsSynced(0);
  }, [clearAutoClose]);

  const updateProgress = useCallback((type: string, items: number) => {
    setCurrentType(type);
    setItemsSynced(items);
  }, []);

  const completeSync = useCallback((items: number) => {
    clearAutoClose();
    setIsSyncing(true);
    setIsCompleted(true);
    setItemsSynced(items);
    setCurrentType('completed');

    // Keep the completed state visible briefly, then fully release the global
    // synchronization lock so a future import can start normally.
    autoCloseTimeoutRef.current = setTimeout(() => {
      autoCloseTimeoutRef.current = null;
      resetState();
    }, COMPLETION_DISPLAY_MS);
  }, [clearAutoClose, resetState]);

  const endSync = useCallback(() => {
    clearAutoClose();
    resetState();
  }, [clearAutoClose, resetState]);

  useEffect(() => {
    return () => clearAutoClose();
  }, [clearAutoClose]);

  return (
    <AutoSyncContext.Provider value={{
      isSyncing,
      isCompleted,
      currentType,
      storeName,
      itemsSynced,
      startSync,
      updateProgress,
      completeSync,
      endSync,
    }}>
      {children}
    </AutoSyncContext.Provider>
  );
}

export function useAutoSyncProgress() {
  const context = useContext(AutoSyncContext);
  if (!context) {
    throw new Error('useAutoSyncProgress must be used within AutoSyncProvider');
  }
  return context;
}
